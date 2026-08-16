import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  // One PartyTap account — business sign-in uses the same identity flow.
  beforeLoad: () => {
    throw redirect({ to: "/account/auth", search: { next: "/dashboard" } });
  },
  component: () => null,
});
