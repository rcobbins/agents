#!/bin/bash

# Escape Utilities for Agent Framework
# Provides functions for safely escaping strings in various contexts

# Escape string for JSON
escape_json() {
    local string="$1"
    # Escape backslashes first, then quotes, then control characters
    string="${string//\\/\\\\}"
    string="${string//\"/\\\"}"
    string="${string//$'\n'/\\n}"
    string="${string//$'\r'/\\r}"
    string="${string//$'\t'/\\t}"
    string="${string//$'\b'/\\b}"
    string="${string//$'\f'/\\f}"
    echo "$string"
}

# Escape string for shell command
escape_shell() {
    local string="$1"
    # Use printf to safely escape for shell
    printf '%q' "$string"
}

# Escape string for regex
escape_regex() {
    local string="$1"
    # Escape special regex characters
    string="${string//\\/\\\\}"
    string="${string//./\\.}"
    string="${string//\*/\\*}"
    string="${string//+/\\+}"
    string="${string//\?/\\?}"
    string="${string//[/\\[}"
    string="${string//]/\\]}"
    string="${string//\{/\\{}"
    string="${string//\}/\\}}"
    string="${string//\(/\\(}"
    string="${string//\)/\\)}"
    string="${string//\^/\\^}"
    string="${string//\$/\\$}"
    string="${string//|/\\|}"
    echo "$string"
}

# Escape string for HTML
escape_html() {
    local string="$1"
    string="${string//&/&amp;}"
    string="${string//</&lt;}"
    string="${string//>/&gt;}"
    string="${string//\"/&quot;}"
    string="${string//'/&#x27;}"
    echo "$string"
}

# Escape string for URL
escape_url() {
    local string="$1"
    # Use printf with %XX hex encoding
    local length="${#string}"
    local i
    for (( i = 0; i < length; i++ )); do
        local c="${string:i:1}"
        case "$c" in
            [a-zA-Z0-9._~-])
                printf '%s' "$c"
                ;;
            *)
                printf '%%%02X' "'$c"
                ;;
        esac
    done
    echo
}

# Escape string for SQL
escape_sql() {
    local string="$1"
    # Basic SQL escape - doubles single quotes
    string="${string//'/''}"
    echo "$string"
}

# Escape string for markdown
escape_markdown() {
    local string="$1"
    # Escape markdown special characters
    string="${string//\\/\\\\}"
    string="${string//\*/\\*}"
    string="${string//_/\\_}"
    string="${string//\[/\\[}"
    string="${string//\]/\\]}"
    string="${string//\(/\\(}"
    string="${string//\)/\\)}"
    string="${string//\#/\\#}"
    string="${string//+/\\+}"
    string="${string//-/\\-}"
    string="${string//./\\.}"
    string="${string//!/\\!}"
    string="${string//\`/\\\`}"
    echo "$string"
}

# Escape string for CSV
escape_csv() {
    local string="$1"
    # If contains comma, newline, or quote, wrap in quotes and escape quotes
    if [[ "$string" =~ [,\"\n] ]]; then
        string="${string//\"/\"\"}"
        echo "\"$string\""
    else
        echo "$string"
    fi
}

# Unescape JSON string
unescape_json() {
    local string="$1"
    # Reverse JSON escaping
    string="${string//\\n/$'\n'}"
    string="${string//\\r/$'\r'}"
    string="${string//\\t/$'\t'}"
    string="${string//\\b/$'\b'}"
    string="${string//\\f/$'\f'}"
    string="${string//\\\"/\"}"
    string="${string//\\\\/\\}"
    echo "$string"
}

# Validate JSON string
validate_json() {
    local json="$1"
    echo "$json" | python3 -m json.tool >/dev/null 2>&1
    return $?
}

# Sanitize filename
sanitize_filename() {
    local filename="$1"
    # Remove or replace unsafe characters
    filename="${filename//\//_}"
    filename="${filename//\\/_}"
    filename="${filename//:/_}"
    filename="${filename//\*/_}"
    filename="${filename//\?/_}"
    filename="${filename//\"/_}"
    filename="${filename//</_}"
    filename="${filename//>/_}"
    filename="${filename//|/_}"
    # Remove leading/trailing spaces and dots
    filename="${filename#"${filename%%[![:space:]]*}"}"
    filename="${filename%"${filename##*[![:space:]]}"}"
    filename="${filename#.}"
    filename="${filename%.}"
    echo "$filename"
}

# Escape for environment variable
escape_env() {
    local string="$1"
    # Remove or escape problematic characters for environment variables
    string="${string//[^a-zA-Z0-9_]/_}"
    # Ensure doesn't start with number
    if [[ "$string" =~ ^[0-9] ]]; then
        string="_$string"
    fi
    echo "$string"
}

# Truncate string safely
truncate_string() {
    local string="$1"
    local max_length="${2:-100}"
    if [[ ${#string} -gt $max_length ]]; then
        echo "${string:0:$((max_length-3))}..."
    else
        echo "$string"
    fi
}

# Export all functions
export -f escape_json
export -f escape_shell
export -f escape_regex
export -f escape_html
export -f escape_url
export -f escape_sql
export -f escape_markdown
export -f escape_csv
export -f unescape_json
export -f validate_json
export -f sanitize_filename
export -f escape_env
export -f truncate_string