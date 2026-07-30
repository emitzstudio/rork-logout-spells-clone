import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Page from "@/components/site/Layout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Page title="Page Not Found">
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(184,150,62,0.12), transparent 70%)",
          }}
        />
        <div className="relative">
          <span className="animate-float-slow font-serif text-6xl text-gold/60" aria-hidden>
            ✦
          </span>
          <h1 className="heading-serif mt-6 text-7xl text-cream md:text-9xl">404</h1>
          <p className="mt-5 font-serif text-2xl italic text-cream/60">
            This spell doesn't exist… yet.
          </p>
          <Link to="/" className="btn-gold mt-10">
            Return Somewhere Real
          </Link>
        </div>
      </section>
    </Page>
  );
};

export default NotFound;
