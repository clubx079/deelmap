# DeelMap — Bot Detection & Security Research

---

## The Problem

DeelMap's deal listings and seller data are valuable assets. Competitors or bad actors can use automated bots to bulk-scrape this data without signing up, undermining the platform's competitive advantage. The two main entry points for scrapers are:

1. The **marketplace page** — publicly visible listing previews
2. The **deals API** — the backend endpoints that power the marketplace

---

## What We're Protecting Against

| Threat | Description |
|--------|-------------|
| Simple scrapers | Scripts that hit your API and download all listings in seconds |
| Headless browsers | Automated Chrome/Firefox instances that look like real users |
| High-volume bots | Bots that paginate through hundreds of listings rapidly |
| Data harvesters | Bots targeting seller phone numbers and contact details |

---

## Option 1: Cloudflare

**What it is:**
Cloudflare is a global network that sits in front of your website. All traffic passes through Cloudflare before reaching your server, giving it the ability to block threats at the network level.

**How it works:**
Instead of blocking inside the application, Cloudflare blocks traffic before it even reaches DeelMap's servers. This is more powerful for large-scale attacks.

**Plans available:**

| Plan | Cost (monthly billing) | Cost (annual billing) | Bot Protection |
|------|----------------------|----------------------|----------------|
| Free | $0 | $0 | Basic bot blocking, DDoS protection |
| Pro | $25/month | $20/month | Super Bot Fight Mode, OWASP WAF, 20 custom WAF rules |
| Business | $250/month | $200/month | Advanced WAF (310 rules), PCI/SOC2 compliance, 100% uptime SLA |
| Enterprise | Custom pricing | Custom pricing | Full ML behavioral analysis, dedicated support team |

**Limitations:**
The free tier only blocks known bots — sophisticated custom scrapers will pass through. The Enterprise plan that catches everything is priced for large corporations.

---

## Option 2: Arcjet

**What it is:**
Arcjet is a security tool built specifically for modern web applications like DeelMap. It installs directly into the application code and inspects every request before it reaches your data.

**How it works:**
Think of it as a security checkpoint inside your API. Every time someone (or a bot) requests deal listings, Arcjet checks them first. If something looks suspicious, it blocks the request before any data is sent.

**What it detects:**
- Known scraping tools and bot frameworks
- Requests missing normal browser signatures
- Suspicious request patterns (too many requests too fast)
- Automated tools masquerading as real browsers

**Rate Limiting:**
Even if a bot perfectly mimics a real browser, it still needs to make hundreds of requests to scrape all listings. A real human browsing the marketplace makes maybe 5-10 requests per session. Arcjet can cap requests at 30 per minute per visitor — real users never notice, bots get blocked immediately.

**Plans available:**

| Plan | Cost | Team Members | Log Retention |
|------|------|-------------|---------------|
| Individual | $25/month per app + usage | 1 | 1 hour |
| Startup | $299/month per app + usage | 2 | 24 hours |
| Growth | $799/month per app + usage | 10 | 30 days |
| Enterprise | Custom pricing | Unlimited | Custom |

**Usage-based costs (on top of plan fee):**
- Bot Detection: $0.50 per 1M requests
- Rate Limiting + WAF: $0.50 per 1M requests

**Limitations:**
- Sophisticated bots using large networks of rotating IP addresses (residential proxies) can bypass rate limiting
- No free tier — starts at $25/month per app

---

## Summary

| Tool | Cost | Protection Level |
|------|------|-----------------|
| Cloudflare Free | $0 | Basic — blocks known bots, DDoS protection |
| Cloudflare Pro | $25/month (or $20/month annual) | Good — Super Bot Fight Mode, OWASP WAF |
| Cloudflare Business | $250/month (or $200/month annual) | Better — advanced WAF, compliance |
| Cloudflare Enterprise | Custom | Best — full ML behavioral analysis |
| Arcjet Individual | $25/month + usage | Good — rate limiting + bot detection |
| Arcjet Startup | $299/month + usage | Better — production-ready, Slack support |
