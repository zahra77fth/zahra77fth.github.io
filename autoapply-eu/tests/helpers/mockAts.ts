import http from "node:http";
import type { AddressInfo } from "node:net";

/** Local-only mock applicant tracking system used for end-to-end submission tests. */
export interface MockAts {
  url: string;
  submissions: Record<string, number>;
  close: () => Promise<void>;
}

const page = (title: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>.step{display:none}.step.active{display:block}label{display:block;margin:6px 0}</style></head><body><h1>${title}</h1>${body}</body></html>`;

const contactFields = `
  <label for="first_name">First Name *</label><input id="first_name" name="first_name" required>
  <label for="last_name">Last Name *</label><input id="last_name" name="last_name" required>
  <label for="email">Email *</label><input id="email" name="email" type="email" required>
  <label for="phone">Phone</label><input id="phone" name="phone">
  <label for="resume">Resume/CV *</label><input id="resume" name="resume" type="file" required>
  <label for="cover">Cover Letter</label><input id="cover" name="cover_letter" type="file">
  <label><input type="checkbox" name="privacy" required> I agree to the privacy policy *</label>`;

export async function startMockAts(): Promise<MockAts> {
  const submissions: Record<string, number> = {};
  const server = http.createServer((req, res) => {
    const u = new URL(req.url ?? "/", "http://localhost");
    const send = (html: string, status = 200) => res.writeHead(status, { "content-type": "text/html; charset=utf-8" }).end(html);
    if (req.method === "POST") {
      const scenario = u.pathname.split("/")[1];
      let size = 0;
      req.on("data", (c: Buffer) => (size += c.length));
      req.on("end", () => {
        submissions[scenario] = (submissions[scenario] ?? 0) + 1;
        if (size < 500) return send(page("Error", "<p role='alert'>Upload missing</p>"), 400);
        if (scenario === "silent") return send(page("Processing", "<p>Please wait.</p>"));
        res.writeHead(303, { location: `/${scenario}/confirmation?ref=APP-${1000 + submissions[scenario]}` }).end();
      });
      return;
    }
    switch (u.pathname) {
      case "/simple/apply":
      case "/silent/apply":
        return send(page("Frontend Developer — Acme", `<form id="application-form" method="post" action="/${u.pathname.split("/")[1]}/submit" enctype="multipart/form-data">${contactFields}<button type="submit">Submit application</button></form>`));
      case "/multi/apply":
        return send(
          page(
            "React Engineer — Beta",
            `<form id="application-form" method="post" action="/multi/submit" enctype="multipart/form-data">
  <div class="step active" id="s1">${contactFields.replace(/<label for="resume">[\s\S]*?type="file">/, "")}<button type="button" onclick="go(2)">Next</button></div>
  <div class="step" id="s2">
    <fieldset><legend>Are you legally authorized to work in Germany? *</legend>
      <label><input type="radio" name="auth" value="yes" required> Yes</label><label><input type="radio" name="auth" value="no"> No</label></fieldset>
    <label for="sponsor">Will you require visa sponsorship? *</label><select id="sponsor" name="sponsor" required><option value="">Select</option><option>Yes</option><option>No</option></select>
    <label for="gender">Gender</label><select id="gender" name="gender"><option value="">Select</option><option>Female</option><option>Male</option><option>Decline to self-identify</option></select>
    <button type="button" onclick="go(3)">Continue</button></div>
  <div class="step" id="s3"><label for="resume">Resume/CV *</label><input id="resume" name="resume" type="file" required>
    <label for="why">Why do you want to work at Beta?</label><textarea id="why" name="why"></textarea>
    <button type="submit">Submit application</button></div>
</form><script>function go(n){document.querySelectorAll('.step').forEach(s=>s.classList.remove('active'));document.getElementById('s'+n).classList.add('active')}</script>`,
          ),
        );
      case "/captcha/apply":
        return send(page("Job", `<form id="application-form">${contactFields}<div class="g-recaptcha" data-sitekey="test" style="width:300px;height:80px;border:1px solid"></div><button type="submit">Submit application</button></form>`));
      case "/login/apply":
        return send(page("Sign in", `<form><label for="u">Email</label><input id="u" type="email"><label for="p">Password</label><input id="p" type="password"><button>Sign in</button></form>`));
      case "/unknown/apply":
        return send(page("Job", `<form id="application-form" method="post" action="/unknown/submit" enctype="multipart/form-data">${contactFields}<label for="q">What is your favourite design pattern? *</label><textarea id="q" name="q" required></textarea><button type="submit">Submit application</button></form>`));
      default:
        if (u.pathname.endsWith("/confirmation")) return send(page("Application received", `<p>Thank you for applying! Your application reference number: ${u.searchParams.get("ref")}</p>`));
        return send(page("Not found", ""), 404);
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://localhost:${(server.address() as AddressInfo).port}`,
    submissions,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}
