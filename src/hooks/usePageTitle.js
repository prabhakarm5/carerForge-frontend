import { useEffect } from "react";

const SITE_NAME = "CareerForge AI";

// Usage inside any page component:
//   usePageTitle("Login");        -> tab shows "Login · CareerForge AI"
//   usePageTitle();               -> tab shows just "CareerForge AI"
//
// Put this as the first line inside each page's component function,
// e.g. LoginForm, RegisterForm, Dashboard, NotFound, etc.
export default function usePageTitle(pageName) {
    useEffect(() => {
        document.title = pageName ? `${pageName} · ${SITE_NAME}` : SITE_NAME;

        // Restore the base title when the page unmounts (route changes away)
        return () => {
            document.title = SITE_NAME;
        };
    }, [pageName]);
}