# Hosting the Privacy Policy on GitHub Pages

1. Create a new public GitHub repository named `subtrack-privacy`
2. Upload `docs/privacy-policy.html` as `index.html` to the repo root
3. In the repo Settings → Pages → Source: Deploy from branch `main`, folder `/root`
4. After ~1 minute, the policy will be live at:
   `https://YOUR_GITHUB_USERNAME.github.io/subtrack-privacy`
5. Update the privacy policy URL in `mobile/app/(app)/paywall.tsx` (search for `paywall.privacy` text node)
