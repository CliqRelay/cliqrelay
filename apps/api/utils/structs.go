package utils

import "reflect"

func StructToMap(obj any) map[string]any {
	result := make(map[string]any)
	v := reflect.ValueOf(obj)
	t := reflect.TypeOf(obj)

	// If a pointer is passed, get the underlying element
	if v.Kind() == reflect.Pointer {
		v = v.Elem()
		t = t.Elem()
	}

	for i := 0; i < v.NumField(); i++ {
		field := t.Field(i)
		value := v.Field(i)

		// Skip unexported fields
		if field.PkgPath != "" {
			continue
		}

		result[field.Name] = value.Interface()
	}

	return result
}
