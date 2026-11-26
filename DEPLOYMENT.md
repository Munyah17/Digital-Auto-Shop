# cPanel GitHub Auto-Deployment

This setup updates the cPanel site automatically when changes are pushed to the `main` branch on GitHub.

Flow:

1. Push to `main` on GitHub.
2. GitHub calls `https://your-domain.com/deploy.php`.
3. `deploy.php` verifies the GitHub webhook signature.
4. cPanel pulls the latest commit into the Git Version Control repository.
5. cPanel runs `.cpanel.yml` and copies the website files into `public_html`.

## One-time cPanel setup

### 1. Connect the GitHub repository in cPanel

1. Open **cPanel → Files → Git Version Control**.
2. Create or clone the repository from:

   ```text
   https://github.com/Munyah17/Digital-Auto-Shop.git
   ```

3. Use a repository path outside `public_html`, for example:

   ```text
   /home/CPANEL_USER/repositories/digital-auto-shop
   ```

4. Leave the working branch as `main`.

The `.cpanel.yml` file in this repository controls what gets copied to the website. By default it deploys to:

```text
$HOME/public_html/
```

If this site uses an addon domain or a different document root, edit `DEPLOYPATH` in `.cpanel.yml` before deploying.

### 2. Create a cPanel API token

1. Open **cPanel → Security → Manage API Tokens**.
2. Create a token named something like `github-deploy`.
3. Copy the token immediately; cPanel only shows it once.
4. Store it outside `public_html`:

   ```text
   /home/CPANEL_USER/.deploy-token
   ```

   The file should contain only the token. If possible, set permissions to `600`.

### 3. Create the GitHub webhook secret

Generate a long random secret, for example:

```powershell
openssl rand -hex 32
```

Store the same value outside `public_html`:

```text
/home/CPANEL_USER/.github-webhook-secret
```

The file should contain only the secret. If possible, set permissions to `600`.

### 4. Create `deploy-config.php`

On the server, create this file inside `public_html`:

```text
public_html/deploy-config.php
```

Use `deploy-config.example.php` as the template and replace the placeholder values:

```php
<?php

return [
    'cpanel_api_base' => 'https://your-server.example.com:2083',
    'cpanel_user' => 'yourcpaneluser',
    'repo_root' => '/home/yourcpaneluser/repositories/digital-auto-shop',
    'branch' => 'main',
    'github_secret_file' => '/home/yourcpaneluser/.github-webhook-secret',
    'cpanel_token_file' => '/home/yourcpaneluser/.deploy-token',
];
```

Important:

- `deploy-config.php` contains no passwords or tokens, but do not commit it to Git.
- The real secrets stay in `.github-webhook-secret` and `.deploy-token` outside `public_html`.
- `cpanel_api_base` can be the server hostname with `:2083`, or your domain if cPanel API access works over that hostname.

Upload `deploy.php` to `public_html` as well, or run one manual cPanel deploy first so `.cpanel.yml` copies it there. The webhook URL must point to this file. `deploy-config.php` is not stored in Git, so later deployments will not overwrite it.

### 5. Add the GitHub webhook

1. Open the GitHub repository.
2. Go to **Settings → Webhooks → Add webhook**.
3. Set **Payload URL** to:

   ```text
   https://your-domain.com/deploy.php
   ```

4. Set **Content type** to `application/json`.
5. Set **Secret** to the same value stored in `.github-webhook-secret`.
6. Under **Which events would you like to trigger this webhook?**, choose **Just the push event**.
7. Click **Add webhook**.

GitHub will send a `ping` event immediately. A successful response is `pong`.

## Test the deployment

1. Push a small change to `main`.
2. In GitHub, open **Settings → Webhooks → Recent Deliveries**.
3. Confirm the delivery returns `Deployment started.`
4. In cPanel, open **Git Version Control → Manage → Pull or Deploy** and confirm the latest deployment appears.

## What gets deployed

`.cpanel.yml` currently copies:

- `*.html`
- `*.css`
- `*.php`
- `*.js` except `server.js`

It does **not** deploy:

- `.git`
- `backend/`
- `server.js`
- `backend/data/store.json`

If the Node backend must run on cPanel, configure it separately through cPanel's Node.js App feature and provide `backend/.env` on that app. This Git deployment is for the website/PHP files.

## Troubleshooting

- **403 Invalid webhook signature** — the GitHub webhook secret does not match `.github-webhook-secret`.
- **500 GitHub webhook secret is not configured** — `.github-webhook-secret` is missing, empty, or has the wrong path.
- **500 cPanel API token is not configured** — `.deploy-token` is missing, empty, or has the wrong path.
- **cPanel API failed** — check that the API token is valid, `repo_root` is correct, the repository working tree is clean, and `.cpanel.yml` is valid.
- **Files do not appear in `public_html`** — confirm `DEPLOYPATH` in `.cpanel.yml` points to the correct document root.

## Security notes

- Never put the GitHub webhook secret or cPanel API token inside the repository or `public_html`.
- Keep `.deploy-token` and `.github-webhook-secret` outside the website root.
- The webhook only accepts signed GitHub `push` events for the configured branch.
