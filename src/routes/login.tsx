import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { update } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — PartyTap" },
      { name: "description", content: "Sign in to your PartyTap admin workspace (demo)." },
      { property: "og:title", content: "Sign in — PartyTap" },
      { property: "og:description", content: "Sign in to your PartyTap admin workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@partytap.com");

  return (
    <div className="grid min-h-screen bg-surface hero-glow place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <form
          className="card-soft mt-6 space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            update((db) => ({ ...db, signedIn: true }));
            navigate({ to: "/dashboard" });
          }}
        >
          <div>
            <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Demo sign-in — no password needed.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
