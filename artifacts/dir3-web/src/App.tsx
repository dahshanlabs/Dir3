import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Playground from "@/pages/Playground";
import Shield from "@/pages/Shield";
import Scanner from "@/pages/Scanner";
import Leaderboard from "@/pages/Leaderboard";
import Detect from "@/pages/Detect";
import Layout from "@/components/Layout";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/playground">
        <Layout><Playground /></Layout>
      </Route>
      <Route path="/shield">
        <Layout><Shield /></Layout>
      </Route>
      <Route path="/scanner">
        <Layout><Scanner /></Layout>
      </Route>
      <Route path="/leaderboard">
        <Layout><Leaderboard /></Layout>
      </Route>
      <Route path="/detect">
        <Layout><Detect /></Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
