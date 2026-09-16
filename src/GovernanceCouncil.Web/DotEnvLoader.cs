namespace GovernanceCouncil.Web;

/// <summary>
/// Minimal <c>.env</c> reader for local development after <c>azd provision</c>.
/// Real host configuration always wins: a variable already present in the process
/// environment is never overwritten by the file.
/// </summary>
public static class DotEnvLoader
{
    public static void Load(string path)
    {
        if (!File.Exists(path)) return;

        foreach (var line in File.ReadAllLines(path))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith('#')) continue;

            if (trimmed.StartsWith("export ", StringComparison.Ordinal))
                trimmed = trimmed["export ".Length..].TrimStart();

            var idx = trimmed.IndexOf('=');
            if (idx <= 0) continue;

            var key = trimmed[..idx].Trim();
            if (key.Length == 0) continue;

            // Real host configuration beats the file.
            if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key))) continue;

            Environment.SetEnvironmentVariable(key, ParseValue(trimmed[(idx + 1)..]));
        }
    }

    /// <summary>
    /// Unwraps a quoted value, or strips an unquoted inline <c>#</c> comment.
    /// Inside double quotes, <c>\"</c>, <c>\\</c>, <c>\n</c>, <c>\r</c> and <c>\t</c> are unescaped.
    /// </summary>
    private static string ParseValue(string raw)
    {
        var value = raw.TrimStart();
        if (value.Length == 0) return string.Empty;

        var quote = value[0];
        if (quote is '"' or '\'')
        {
            var sb = new System.Text.StringBuilder();
            for (var i = 1; i < value.Length; i++)
            {
                var c = value[i];
                if (c == quote) break;
                if (quote == '"' && c == '\\' && i + 1 < value.Length)
                {
                    var next = value[++i];
                    sb.Append(next switch
                    {
                        'n' => '\n',
                        'r' => '\r',
                        't' => '\t',
                        '\\' => '\\',
                        '"' => '"',
                        _ => next
                    });
                    continue;
                }
                sb.Append(c);
            }
            return sb.ToString();
        }

        // Unquoted: an inline comment must be preceded by whitespace.
        var hash = value.IndexOf(" #", StringComparison.Ordinal);
        if (hash >= 0) value = value[..hash];
        return value.TrimEnd();
    }
}
