package utils

import (
	"encoding/json"
	"net/http"
)

func ParseJSON(r *http.Request, dest any) error {
	decoder := json.NewDecoder(r.Body)
	return decoder.Decode(dest)
}
