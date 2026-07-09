import React from "react";

const pipelineSteps = [
  "Developer code change karta hai",
  "git push origin main hota hai",
  "GitHub Actions workflow start hota hai",
  "Docker image build hoti hai",
  "Docker image Docker Hub par push hoti hai",
  "Dockerrun.aws.json bundle create hota hai",
  "Elastic Beanstalk par deploy hota hai",
  "AWS latest Docker image pull karke backend restart karta hai",
];

const envVars = [
  "SPRING_PROFILES_ACTIVE=prod",
  "SERVER_PORT=5000",
  "DB_URL",
  "DB_USERNAME",
  "DB_PASSWORD",
  "JWT_SECRET",
  "FRONTEND_URL",
  "UPSTASH_REDIS_HOST",
  "UPSTASH_REDIS_PORT",
  "UPSTASH_REDIS_TOKEN",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "GROQ_API_KEY",
  "OPENROUTER_API_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];

const commands = [
  "git status",
  "git add .",
  'git commit -m "Updated backend"',
  "git push origin main",
];

export default function DeveloperDocumentation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-blue-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-3xl border border-cyan-400/20 bg-white/10 backdrop-blur-xl p-8 shadow-2xl">
          <p className="text-cyan-300 font-semibold mb-3">
            Developer / HR Technical Documentation
          </p>

          <h1 className="text-4xl md:text-6xl font-black mb-5">
            CareerForge AI Deployment & Architecture
          </h1>

          <p className="text-slate-300 text-lg max-w-4xl">
            Ye documentation developers, HR technical reviewers aur project
            evaluators ke liye hai. Isme backend architecture, CI/CD pipeline,
            Docker, AWS Elastic Beanstalk aur environment configuration explain
            hai.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <InfoCard title="Backend" value="Spring Boot + Docker" />
          <InfoCard title="Database" value="Neon PostgreSQL" />
          <InfoCard title="Deployment" value="AWS Elastic Beanstalk" />
          <InfoCard title="Cache" value="Upstash Redis" />
          <InfoCard title="Media" value="Cloudinary" />
          <InfoCard title="CI/CD" value="GitHub Actions + Docker Hub" />
        </div>

        <Section title="CI/CD Pipeline Flow">
          <div className="space-y-4">
            {pipelineSteps.map((step, index) => (
              <div
                key={index}
                className="flex gap-4 items-start rounded-xl bg-slate-900/70 border border-white/10 p-4"
              >
                <div className="w-9 h-9 rounded-full bg-cyan-500 text-black font-bold flex items-center justify-center">
                  {index + 1}
                </div>
                <p className="text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Elastic Beanstalk Configuration">
          <div className="grid md:grid-cols-2 gap-4">
            <CodeBox label="Application Name" value="careerforge-ai" />
            <CodeBox label="Environment Name" value="Careerforge-ai-env" />
            <CodeBox label="Region" value="ap-south-1" />
            <CodeBox label="Platform" value="Docker Amazon Linux 2023" />
            <CodeBox label="Docker Image" value="prabhakar7277/trackai-backend:latest" />
            <CodeBox label="Container Port" value="5000" />
          </div>
        </Section>

        <Section title="Required Environment Variables">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {envVars.map((item) => (
              <div
                key={item}
                className="rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-emerald-300"
              >
                {item}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Daily Deployment Commands">
          <div className="rounded-2xl bg-black border border-cyan-400/20 p-5">
            {commands.map((cmd) => (
              <pre key={cmd} className="text-emerald-300 mb-2 overflow-x-auto">
                {cmd}
              </pre>
            ))}
          </div>
        </Section>

        <Section title="Why S3 is used?">
          <p className="text-slate-300 leading-relaxed">
            Elastic Beanstalk deployment ke time GitHub Actions ek deployment
            bundle banata hai jisme Dockerrun.aws.json hota hai. Ye zip package
            Elastic Beanstalk ke S3 bucket me upload hota hai. S3 yahan database
            ya user image storage ke liye nahi hai. Ye sirf deployment versions
            store karne ke liye use hota hai.
          </p>
        </Section>

        <Section title="Important Notes">
          <ul className="list-disc pl-6 text-slate-300 space-y-2">
            <li>Production me SPRING_PROFILES_ACTIVE hamesha prod hona chahiye.</li>
            <li>SERVER_PORT aur ContainerPort dono 5000 hone chahiye.</li>
            <li>NGROK_AUTH_TOKEN production me add nahi karna.</li>
            <li>Upstash Redis host me https:// ya rediss:// nahi hona chahiye.</li>
            <li>Secrets GitHub repo secrets me hon, code me hardcode na hon.</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}

function InfoCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-xl">
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <h2 className="text-xl font-bold">{value}</h2>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-7 shadow-xl">
      <h2 className="text-3xl font-bold mb-5 text-cyan-200">{title}</h2>
      {children}
    </section>
  );
}

function CodeBox({ label, value }) {
  return (
    <div className="rounded-xl bg-black/40 border border-white/10 p-4">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-emerald-300 font-mono text-sm break-all">{value}</p>
    </div>
  );
}