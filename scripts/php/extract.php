<?php
// Static extractor: tokenizes WordPress core PHP and emits functions, classes,
// methods and hooks (with their docblocks) as JSON. It never includes/executes WP code.
// usage: php extract.php <wordpress-root> <version>
[, $root, $version] = $argv + [null, null, 'unknown'];
$root = rtrim(realpath($root), '/');
$skip = '#/(wp-content|ID3|PHPMailer|SimplePie|Requests|sodium_compat|Text|IXR|js|css|images|fonts|certificates|SimplePie|php-ai-client|php-compat|random_compat|pomo|block-supports|blocks/[^/]+)/#';
$dirs = ['wp-includes', 'wp-admin/includes', 'wp-admin'];
$rootFiles = ['wp-settings.php', 'wp-load.php', 'wp-blog-header.php', 'wp-cron.php', 'wp-login.php'];
$out = ['version' => $version, 'functions' => [], 'classes' => [], 'methods' => [], 'hooks' => []];

function parse_doc(?string $raw): array {
    if (!$raw) return ['summary' => '', 'description' => '', 'tags' => []];
    $lines = preg_split('/\R/', $raw);
    $clean = [];
    foreach ($lines as $l) {
        $l = preg_replace('#^\s*/\*\*+\s?|\s*\*+/\s*$#', '', $l);
        $l = preg_replace('#^\s*\*\s?#', '', $l);
        $clean[] = rtrim($l);
    }
    $text = trim(implode("\n", $clean));
    $tags = []; $body = $text; $cur = null;
    if (preg_match('/^@/m', $text, $m, PREG_OFFSET_CAPTURE)) {
        $body = trim(substr($text, 0, $m[0][1]));
        $tagText = substr($text, $m[0][1]);
        foreach (preg_split('/\n(?=@)/', $tagText) as $t) {
            if (!preg_match('/^@(\w[\w-]*)\s*(.*)$/s', trim($t), $mm)) continue;
            $tags[$mm[1]][] = $mm[1] === 'param' ? preg_replace('/[ \t]*\n[ \t]*/', "\n", trim($mm[2])) : preg_replace('/\s*\n\s*/', ' ', trim($mm[2]));
        }
    }
    $parts = preg_split('/\n\s*\n/', $body, 2);
    return ['summary' => trim(preg_replace('/\s*\n\s*/', ' ', $parts[0] ?? '')), 'description' => trim($parts[1] ?? ''), 'tags' => $tags];
}
function parse_params(array $tags): array {
    $ps = [];
    foreach ($tags['param'] ?? [] as $p) {
        if (preg_match('/^(\S+)\s+(\$[\w.]+|\.\.\.\$\w+)\s*(.*)$/s', $p, $m)) $ps[] = ['type' => $m[1], 'name' => $m[2], 'description' => $m[3]];
        else $ps[] = ['type' => '', 'name' => '', 'description' => $p];
    }
    return $ps;
}
function skip_ws(array $t, int $i): int { while (isset($t[$i]) && $t[$i]->isIgnorable()) $i++; return $i; }
function collect_until(array $t, int $i, array $stop): array {
    $depth = 0; $s = '';
    for (; isset($t[$i]); $i++) {
        $x = $t[$i]->text;
        if (in_array($x, ['(', '[']) ) $depth++;
        if (in_array($x, [')', ']'])) { if ($depth === 0 && in_array($x, $stop, true)) break; $depth--; }
        elseif ($depth === 0 && in_array($x, $stop, true)) break;
        $s .= $x;
    }
    return [$s, $i];
}

$files = [];
foreach ($dirs as $d) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator("$root/$d", FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) if ($f->getExtension() === 'php' && !preg_match($skip, $f->getPathname()) && !in_array($f->getFilename(), ['noop.php', 'class-pclzip.php'], true)) $files[$f->getPathname()] = true;
}
foreach ($rootFiles as $rf) if (is_file("$root/$rf")) $files["$root/$rf"] = true;
ksort($files);

foreach (array_keys($files) as $file) {
    $rel = substr($file, strlen($root) + 1);
    $t = PhpToken::tokenize(file_get_contents($file));
    $doc = null; $classStack = []; $depth = 0; $n = count($t);
    for ($i = 0; $i < $n; $i++) {
        $tok = $t[$i];
        if ($tok->id === T_DOC_COMMENT) { $doc = $tok->text; continue; }
        if ($tok->text === '{' || $tok->text === T_CURLY_OPEN) { $depth++; }
        elseif ($tok->text === '}') { $depth--; if ($classStack && end($classStack)[1] >= $depth) array_pop($classStack); $doc = null; }
        elseif ($tok->text === ';') { $doc = null; }
        if (in_array($tok->id, [T_CLASS, T_INTERFACE, T_TRAIT], true)) {
            $j = skip_ws($t, $i + 1);
            if (isset($t[$j]) && $t[$j]->id === T_STRING) {
                $name = $t[$j]->text; $d = parse_doc($doc);
                [$sig] = collect_until($t, $j + 1, ['{']);
                $out['classes'][] = ['name' => $name, 'kind' => strtolower(substr($tok->getTokenName(), 2)), 'extends_implements' => trim($sig), 'file' => $rel, 'line' => $tok->line] + $d;
                $classStack[] = [$name, $depth]; $doc = null;
            }
        } elseif ($tok->id === T_FUNCTION) {
            $j = skip_ws($t, $i + 1);
            if ($t[$j]->text === '&') $j = skip_ws($t, $j + 1);
            if (isset($t[$j]) && $t[$j]->id === T_STRING) {
                $name = $t[$j]->text; $d = parse_doc($doc);
                [$sig, $k] = collect_until($t, $j + 1, ['{', ';']);
                $rec = ['name' => $name, 'signature' => $name . trim(preg_replace('/\s+/', ' ', $sig)), 'file' => $rel, 'line' => $tok->line,
                    'summary' => $d['summary'], 'description' => $d['description'], 'tags' => $d['tags'], 'params' => parse_params($d['tags'])];
                $private = false;
                for ($b = $i - 1; $b >= 0 && $b > $i - 6; $b--) { if ($t[$b]->isIgnorable()) continue; if (in_array($t[$b]->id, [T_PUBLIC, T_PROTECTED, T_PRIVATE, T_STATIC, T_FINAL, T_ABSTRACT])) { if (in_array($t[$b]->id, [T_PRIVATE])) $private = true; } else break; }
                if (isset($d['tags']['ignore'])) { $doc = null; continue; } // @ignore: stubs/internal copies, never the real API
                if ($classStack) { $rec['class'] = end($classStack)[0]; if (!$private) $out['methods'][] = $rec; }
                elseif (!preg_match('/^_+\\w{3,}/', $name)) $out['functions'][] = $rec;
                $doc = null;
            }
        } elseif ($tok->id === T_STRING && in_array($tok->text, ['apply_filters', 'do_action', 'apply_filters_ref_array', 'do_action_ref_array', 'apply_filters_deprecated', 'do_action_deprecated'], true)) {
            $j = skip_ws($t, $i + 1);
            if (!isset($t[$j]) || $t[$j]->text !== '(') continue;
            [$arg, $k] = collect_until($t, $j + 1, [',', ')']);
            $arg = trim($arg);
            $dyn = !preg_match("/^(['\"])[^'\"\$]*\\1$/", $arg);
            $nameStr = trim(preg_replace('/(?<=[\w}\'"])\s*\.\s*(?=[\w{$\'"])/', '', $arg), "'\" ");
            $d = parse_doc($doc);
            $out['hooks'][] = ['name' => $nameStr, 'raw' => $arg, 'dynamic' => $dyn, 'type' => str_contains($tok->text, 'filter') ? 'filter' : 'action',
                'file' => $rel, 'line' => $tok->line, 'summary' => $d['summary'], 'description' => $d['description'], 'tags' => $d['tags'], 'params' => parse_params($d['tags'])];
            $doc = null;
        }
    }
}
echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
