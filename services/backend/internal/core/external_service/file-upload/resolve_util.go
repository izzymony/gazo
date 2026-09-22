package fileupload

import (
	"os"
	"sort"
)

// Indirection so tests can drive the environment without setting real vars.
var envGetenv = os.Getenv

func sortStrings(s []string) { sort.Strings(s) }
