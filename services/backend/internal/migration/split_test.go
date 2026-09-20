package migration

import (
	"strings"
	"testing"
)

// The splitter decides where one statement ends, and every case here is a
// place where a `;` or a `--` is ordinary text rather than punctuation. The
// dollar-quote case is not hypothetical: migration 016's DO block failed with
// "unterminated dollar-quoted string" because the body was cut at its first
// internal semicolon.
func TestSplitSQLStatements(t *testing.T) {
	cases := []struct {
		name string
		sql  string
		want []string
	}{
		{
			name: "plain statements",
			sql:  "SELECT 1; SELECT 2;",
			want: []string{"SELECT 1", "SELECT 2"},
		},
		{
			name: "trailing statement without a semicolon",
			sql:  "SELECT 1;\nSELECT 2",
			want: []string{"SELECT 1", "SELECT 2"},
		},
		{
			name: "line comments are dropped",
			sql:  "-- a note; with a semicolon\nSELECT 1;",
			want: []string{"SELECT 1"},
		},
		{
			name: "a semicolon inside a literal is not a separator",
			sql:  "INSERT INTO t VALUES ('a;b'); SELECT 1;",
			want: []string{"INSERT INTO t VALUES ('a;b')", "SELECT 1"},
		},
		{
			name: "a double dash inside a literal is not a comment",
			sql:  "UPDATE t SET note = 'x--y' WHERE id = 1;",
			want: []string{"UPDATE t SET note = 'x--y' WHERE id = 1"},
		},
		{
			name: "an escaped quote does not end the literal",
			sql:  "SELECT 'it''s; fine'; SELECT 2;",
			want: []string{"SELECT 'it''s; fine'", "SELECT 2"},
		},
		{
			name: "a dollar-quoted body survives its own semicolons",
			sql: `DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM t;
  RAISE NOTICE 'n = %', n;
END $$;
SELECT 1;`,
			want: []string{
				"DO $$\nDECLARE n int;\nBEGIN\n  SELECT count(*) INTO n FROM t;\n  RAISE NOTICE 'n = %', n;\nEND $$",
				"SELECT 1",
			},
		},
		{
			name: "a tagged dollar quote is matched by its tag",
			sql:  "CREATE FUNCTION f() RETURNS int AS $body$ BEGIN RETURN 1; END $body$ LANGUAGE plpgsql;\nSELECT 1;",
			want: []string{
				"CREATE FUNCTION f() RETURNS int AS $body$ BEGIN RETURN 1; END $body$ LANGUAGE plpgsql",
				"SELECT 1",
			},
		},
		{
			name: "a lone dollar is not a delimiter",
			sql:  "SELECT * FROM t WHERE a = $1; SELECT 2;",
			want: []string{"SELECT * FROM t WHERE a = $1", "SELECT 2"},
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := splitSQLStatements(c.sql)
			if len(got) != len(c.want) {
				t.Fatalf("got %d statement(s), want %d\n  got:  %q\n  want: %q",
					len(got), len(c.want), got, c.want)
			}
			for i := range got {
				if got[i] != c.want[i] {
					t.Errorf("statement %d:\n  got:  %q\n  want: %q", i, got[i], c.want[i])
				}
			}
		})
	}
}

// Every shipped migration must survive the splitter, since a mangled statement
// only shows up as a syntax error at deploy time.
func TestEveryShippedMigrationSplitsCleanly(t *testing.T) {
	entries, err := embeddedMigrations.ReadDir("sql")
	if err != nil {
		t.Fatalf("read sql dir: %v", err)
	}
	if len(entries) == 0 {
		t.Fatal("no migrations found; this test would pass vacuously")
	}

	for _, entry := range entries {
		body, err := embeddedMigrations.ReadFile("sql/" + entry.Name())
		if err != nil {
			t.Fatalf("read %s: %v", entry.Name(), err)
		}
		for i, stmt := range splitSQLStatements(string(body)) {
			// An odd number of `$$` means a dollar-quoted body was cut in half.
			if strings.Count(stmt, "$$")%2 != 0 {
				t.Errorf("%s statement %d has an unbalanced dollar quote — it was "+
					"split mid-body:\n%s", entry.Name(), i, stmt)
			}
			if strings.Count(stmt, "'")%2 != 0 && !strings.Contains(stmt, "''") {
				t.Errorf("%s statement %d has an unbalanced quote:\n%s", entry.Name(), i, stmt)
			}
		}
	}
}
