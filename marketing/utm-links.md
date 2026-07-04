# ShiftWorksHR — UTM share links

Use these when posting so Stripe checkout can attribute signups (UTM params are captured on visit and passed through checkout metadata).

**Tip:** Keep `utm_campaign` year-neutral (e.g. `comp-review`) so links stay reusable.

## Homepage

| Channel | Link |
| --- | --- |
| LinkedIn post | https://shiftworkshr.com/?utm_source=linkedin&utm_medium=post&utm_campaign=comp-review |
| Email signature | https://shiftworkshr.com/?utm_source=email&utm_medium=signature&utm_campaign=comp-review |
| Cold outreach | https://shiftworkshr.com/?utm_source=email&utm_medium=outreach&utm_campaign=comp-review |

## Sample preview (demo CTA)

| Channel | Link |
| --- | --- |
| LinkedIn comment / DM | https://shiftworkshr.com/sample-preview?utm_source=linkedin&utm_medium=comment&utm_campaign=comp-review&utm_content=sample-preview |
| Reddit (when relevant) | https://shiftworkshr.com/sample-preview?utm_source=reddit&utm_medium=comment&utm_campaign=comp-review |

## Custom links

Append standard params to any URL:

```
?utm_source=CHANNEL&utm_medium=FORMAT&utm_campaign=comp-review&utm_content=OPTIONAL
```

Examples for `utm_source`: `linkedin`, `twitter`, `reddit`, `email`, `newsletter`  
Examples for `utm_medium`: `post`, `comment`, `bio`, `signature`, `outreach`

View attribution on completed checkouts in Stripe → Payments → session metadata (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`).
