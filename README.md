# PartyTap Connect

Build PartyTap as one responsive web application for desktop and mobile. Do not create a separate native mobile app.

Use the attached mockups and PartyTap logo as the visual reference. Match the purple branding, white space, rounded cards, simple icons, and clean modern SaaS style. Keep the UX minimal and easy to understand.

PartyTap launches with two features:

1. Work Tabs
Admins create a paid task in 3 parts:

Public offer: task name, short description, pay amount, deadline, and number of people allowed to claim it

Accepted details: private instructions/files/access information that only unlock after the guest accepts

Payout: demo payout/release state for now

After creation, PartyTap generates a shareable link.

A guest opening the link sees only the public task details and pay. When they confirm, one available slot is assigned to them and the private details unlock. The actual work is completed and reviewed outside PartyTap. The admin later returns to PartyTap and manually clicks Release Payment. For this first build, use demo payment states only; do not connect real Stripe payouts yet.

Work Tab flow:
Admin creates → shares link → guest accepts → details unlock → work happens externally → admin releases demo payment → completed tab appears in history.

2. Bundle Tabs
Bundle Tabs are mainly for sales agencies, partnership firms, marketers, and businesses creating joint offers between two businesses.

Admin selects/enters Business A + Business B, defines the combined offer, and generates a shareable bundle link.

A customer opens the link, sees both businesses and the combined offer, enters the requested booking/contact information, and confirms. Each business remains responsible for fulfilling its own service.

Bundle flow:
Admin creates Business A + Business B offer → shares link → customer opens bundle → enters information → confirms → request appears in admin dashboard/history.

Build now:

Landing/login shell

Admin dashboard

Create Work Tab

Create Bundle Tab

Shareable guest pages

Accepted/locked Work Tab states

Bundle confirmation flow

History/status pages

Responsive desktop and mobile layouts

Demo payout states

Do not build real payments yet. Do not add features outside these two launch flows.

Desktop should prioritize admin/business creation and management. Mobile should be especially clean for guests opening shared Work Tab or Bundle Tab links. Naming clarification:

PartyTap has 2 main launch features:

1. PartyTap Work
This is the feature/section of the platform. Inside PartyTap Work, admins create individual Work Tabs.

2. Bundles
This is the second feature/section of the platform. Inside Bundles, admins create individual Bundle Tabs.

Do not rename the PartyTap Work feature to “Work Tabs.” “Work Tab” only refers to an individual paid task created inside PartyTap Work.

Keep the existing workflow exactly as described. This message is only correcting the naming hierarchy.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d4cd0392-df2a-4e4d-a3fc-5612cd68f6fc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
