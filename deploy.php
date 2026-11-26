<?php
declare(strict_types=1);

/*
 * GitHub -> cPanel automatic deployment webhook.
 *
 * This file is safe to deploy publicly: it contains no secrets. Create
 * public_html/deploy-config.php on the server with the values from
 * deploy-config.example.php. The GitHub secret and cPanel API token must be
 * stored in files outside public_html.
 */

$config = [
    'cpanel_api_base' => 'https://YOUR_SERVER:2083',
    'cpanel_user' => 'YOUR_CPANEL_USER',
    'repo_root' => '/home/YOUR_CPANEL_USER/repositories/digital-auto-shop',
    'branch' => 'main',
    'github_secret_file' => '/home/YOUR_CPANEL_USER/.github-webhook-secret',
    'cpanel_token_file' => '/home/YOUR_CPANEL_USER/.deploy-token',
];

$configFile = __DIR__ . '/deploy-config.php';
if (is_file($configFile)) {
    $override = require $configFile;
    if (is_array($override)) {
        $config = array_merge($config, $override);
    }
}

function respond(int $status, string $message): void
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

function read_secret_file(string $path): string
{
    $value = @file_get_contents($path);
    return is_string($value) ? trim($value) : '';
}

function cpanel_api(array $config, string $function, array $params): array
{
    $token = read_secret_file($config['cpanel_token_file']);
    if ($token === '') {
        throw new RuntimeException('cPanel API token is not configured.');
    }

    $url = rtrim($config['cpanel_api_base'], '/')
        . '/execute/' . $function . '?' . http_build_query($params);

    $ch = curl_init($url);
    if ($ch === false) {
        throw new RuntimeException('Unable to initialize cPanel API request.');
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_HTTPHEADER => [
            'Authorization: cpanel ' . $config['cpanel_user'] . ':' . $token,
        ],
    ]);

    $body = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpStatus = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($body === false) {
        throw new RuntimeException('cPanel API request failed: ' . $curlError);
    }

    $json = json_decode((string) $body, true);
    if (!is_array($json) || (int) ($json['status'] ?? 0) !== 1) {
        $errors = [];
        if (isset($json['errors']) && is_array($json['errors'])) {
            $errors = $json['errors'];
        }
        $detail = $errors ? implode('; ', $errors) : 'invalid cPanel API response';
        throw new RuntimeException($function . ' failed (HTTP ' . $httpStatus . '): ' . $detail);
    }

    return $json;
}

$payload = file_get_contents('php://input');
if (!is_string($payload) || $payload === '') {
    respond(400, 'Empty webhook payload.');
}

$githubSecret = read_secret_file($config['github_secret_file']);
if ($githubSecret === '') {
    respond(500, 'GitHub webhook secret is not configured.');
}

$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$expected = 'sha256=' . hash_hmac('sha256', $payload, $githubSecret);
if (!is_string($signature) || !hash_equals($expected, $signature)) {
    respond(403, 'Invalid webhook signature.');
}

$event = $_SERVER['HTTP_X_GITHUB_EVENT'] ?? '';
if ($event === 'ping') {
    respond(200, 'pong');
}
if ($event !== 'push') {
    respond(200, 'Ignored event.');
}

$data = json_decode($payload, true);
if (!is_array($data)) {
    respond(400, 'Invalid webhook payload.');
}

$expectedRef = 'refs/heads/' . $config['branch'];
if (($data['ref'] ?? '') !== $expectedRef) {
    respond(200, 'Ignored branch.');
}

try {
    cpanel_api($config, 'VersionControl/update', [
        'repository_root' => $config['repo_root'],
        'branch' => $config['branch'],
    ]);

    cpanel_api($config, 'VersionControlDeployment/create', [
        'repository_root' => $config['repo_root'],
    ]);

    respond(200, 'Deployment started.');
} catch (Throwable $e) {
    error_log('GitHub deployment failed: ' . $e->getMessage());
    respond(500, 'Deployment failed. Check the server error log.');
}
