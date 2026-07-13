import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";

import { searchLiveJobs } from "../../services/jobService";
import "./JobsPage.css";

const COUNTRIES = [
  ["in", "India"],
  ["us", "United States"],
  ["gb", "United Kingdom"],
  ["ca", "Canada"],
  ["au", "Australia"],
  ["de", "Germany"],
  ["fr", "France"],
  ["nl", "Netherlands"],
  ["sg", "Singapore"],
  ["nz", "New Zealand"],
];

function displayDate(value) {
  if (!value) return "Recently posted";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently posted";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function salaryLabel(job, country) {
  if (job.salaryMin == null && job.salaryMax == null) return "Salary not listed";
  const currency = country === "in" ? "INR" : country === "gb" ? "GBP" : country === "de" || country === "fr" || country === "nl" ? "EUR" : "USD";
  const format = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 });
  if (job.salaryMin != null && job.salaryMax != null) return `${format.format(job.salaryMin)} - ${format.format(job.salaryMax)}`;
  return format.format(job.salaryMin ?? job.salaryMax);
}

function readableContract(job) {
  const values = [job.contractTime, job.contractType].filter(Boolean).map((value) => value.replaceAll("_", " "));
  return values.join(" | ");
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  const [country, setCountry] = useState(searchParams.get("country") || "in");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async (page = 1) => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await searchLiveJobs({ query, location, country, page });
      setResult(data);
      setSearchParams({ query: query.trim(), ...(location.trim() ? { location: location.trim() } : {}), country });
    } catch (requestError) {
      const message = requestError?.response?.data?.message || requestError.message || "Live jobs could not be loaded.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const jobs = result?.jobs || [];

  return (
    <main className="jobs-page">
      <header className="jobs-heading">
        <div>
          <span><BriefcaseBusiness size={15} />Live job discovery</span>
          <h1>Find roles that are still open</h1>
          <p>Search current listings, review the details, then apply on the original job page.</p>
        </div>
        {result && <strong>{Number(result.totalResults || 0).toLocaleString()} matches</strong>}
      </header>

      <form className="jobs-search-bar" onSubmit={(event) => { event.preventDefault(); runSearch(1); }}>
        <label>
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={120} placeholder="Role or skills, e.g. Java Backend Developer" />
        </label>
        <label>
          <MapPin size={16} />
          <input value={location} onChange={(event) => setLocation(event.target.value)} maxLength={120} placeholder="City or remote" />
        </label>
        <label className="jobs-country">
          <SlidersHorizontal size={15} />
          <select value={country} onChange={(event) => setCountry(event.target.value)}>
            {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
        <button type="submit" disabled={!query.trim() || loading}>{loading ? <LoaderCircle className="jobs-spin" size={17} /> : <Search size={17} />}Search jobs</button>
      </form>

      {error && <section className="jobs-state error"><strong>Job search unavailable</strong><p>{error}</p></section>}
      {!result && !loading && !error && (
        <section className="jobs-empty">
          <BriefcaseBusiness size={28} />
          <h2>Start with your target role</h2>
          <p>Resume AI can send your candidate headline here, or you can search any role and location.</p>
          <div><span>Java Backend Developer</span><span>Spring Boot</span><span>Entry level</span><span>Remote</span></div>
        </section>
      )}
      {loading && <section className="jobs-state"><LoaderCircle className="jobs-spin" size={24} /><strong>Checking current listings...</strong><p>Newest matching jobs are being collected.</p></section>}
      {result && !loading && jobs.length === 0 && <section className="jobs-state"><strong>No current jobs found</strong><p>Try a broader title, another location, or remove a skill keyword.</p></section>}

      {jobs.length > 0 && !loading && (
        <>
          <div className="jobs-result-meta"><span>Newest matching listings</span><small>{result.attribution}</small></div>
          <section className="jobs-list">
            {jobs.map((job) => (
              <article className="job-card" key={`${job.source}-${job.id}`}>
                <div className="job-card-main">
                  <div className="job-company-mark"><Building2 size={18} /></div>
                  <div>
                    <span className="job-company">{job.company}</span>
                    <h2>{job.title}</h2>
                    <div className="job-meta">
                      <span><MapPin size={13} />{job.location}</span>
                      <span><CalendarDays size={13} />{displayDate(job.postedAt)}</span>
                      <span><WalletCards size={13} />{salaryLabel(job, result.country)}</span>
                    </div>
                  </div>
                </div>
                {job.description && <p>{job.description}</p>}
                <footer>
                  <div>{job.category && <span>{job.category}</span>}{readableContract(job) && <span>{readableContract(job)}</span>}<small>{job.source}</small></div>
                  <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">View and apply<ExternalLink size={14} /></a>
                </footer>
              </article>
            ))}
          </section>
          <nav className="jobs-pagination" aria-label="Job result pages">
            <button type="button" disabled={result.page <= 1 || loading} onClick={() => runSearch(result.page - 1)}><ArrowLeft size={15} />Previous</button>
            <span>Page {result.page}</span>
            <button type="button" disabled={jobs.length === 0 || loading} onClick={() => runSearch(result.page + 1)}>Next<ArrowRight size={15} /></button>
          </nav>
        </>
      )}
    </main>
  );
}