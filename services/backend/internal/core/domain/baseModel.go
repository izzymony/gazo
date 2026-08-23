package domain

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StrArray []string

func (st *StrArray) UnmarshalJSON(data []byte) error {
	var tags []string
	if err := json.Unmarshal(data, &tags); err != nil {
		return err
	}
	*st = StrArray(tags)
	return nil
}

func (t StrArray) Value() (driver.Value, error) {
	// Convert the array of strings to JSON
	jsonValue, err := json.Marshal(t)
	if err != nil {
		return nil, err
	}
	return string(jsonValue), nil
}

// Implement the Scanner interface for TagArr (for retrieving the value)
func (t *StrArray) Scan(value interface{}) error {
	var bytes []byte

	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	default:
		return fmt.Errorf("failed to scan value, expected string or []byte but got %T", value)
	}

	return json.Unmarshal(bytes, t)
}

type MapArray []map[string]interface{}

// Implement the Valuer interface for MapArray (for storing the value)
func (j MapArray) Value() (driver.Value, error) {
	// Convert the array of maps to JSON
	jsonValue, err := json.Marshal(j)
	if err != nil {
		return nil, err
	}
	return string(jsonValue), nil
}

// Implement the Scanner interface for MapArray (for retrieving the value)
func (j *MapArray) Scan(value interface{}) error {
	var bytes []byte

	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	default:
		return fmt.Errorf("failed to scan value, expected string or []byte but got %T", value)
	}

	return json.Unmarshal(bytes, j)
}

type Map map[string]interface{}

// Implement the Valuer interface for MapArray (for storing the value)
func (j Map) Value() (driver.Value, error) {
	// Convert the array of maps to JSON
	jsonValue, err := json.Marshal(j)
	if err != nil {
		return nil, err
	}
	return string(jsonValue), nil
}

// Implement the Scanner interface for MapArray (for retrieving the value)
func (j *Map) Scan(value interface{}) error {
	var bytes []byte

	switch v := value.(type) {
	case string:
		bytes = []byte(v)
	case []byte:
		bytes = v
	default:
		return fmt.Errorf("failed to scan value, expected string or []byte but got %T", value)
	}

	return json.Unmarshal(bytes, j)
}

type Model struct {
	ID        string    `sql:"type:uuid; default:uuid_generate_v4();size:100; not null" json:"id"`
	CreatedAt time.Time `json:"created_at,omitempty"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
}

func (u *Model) BeforeCreate(tx *gorm.DB) (err error) {
	u.ID = uuid.New().String()
	if u.ID == "" {
		err = errors.New("can't save invalid data")
	}
	return
}

func (m MapArray) UpdateActivity(action, id string) MapArray {
	m = append(m, map[string]interface{}{
		"action":     action,
		"actor_id":   id,
		"time_stamp": time.Now(),
	})

	return m
}
