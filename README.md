# CLAT Champ — coming soon

A standalone, responsive launch page for clatchamp.com, based on the CLAT SPEED app's dark plum background, violet highlights, rounded cards, system typography and mint learning feedback.

No app source, question bank, credentials, learner data or form submissions are included. The preview is a static editorial teaser, not a functioning workout.

## Hosting

Publish from the main branch, root directory, with GitHub Pages. The page has no build step or third-party dependencies. Edit index.html and styles.css to update it.

## Custom domain configuration

In Domain List → Manage → Advanced DNS, replace the default parking/redirect records for @ and www with the records below. Preserve unrelated mail and verification records.

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | aaditya7-codes.github.io |

Use Automatic TTL. The GitHub Pages custom domain is configured as www.clatchamp.com, with the tracked CNAME file. HTTPS is enabled after certificate provisioning completes. The apex domain redirects to www through GitHub Pages.

Reference: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
