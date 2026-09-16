import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Mic,
  Languages,
  Sparkles,
  ScanLine,
  FileCheck2,
  Leaf,
  Check,
  ShieldCheck,
  HeartPulse,
  Stethoscope,
  UserRound,
  ChevronRight,
} from "lucide-react";
import { Logo, Badge } from "../components/ui";
const features = [
  {
    icon: Mic,
    title: "Speak in your own words",
    text: "Tell your story naturally, or simply tap your answers.",
    tag: "VOICE, TAP & HELPER",
  },
  {
    icon: Languages,
    title: "Your language. Your comfort.",
    text: "A more familiar experience in five Indian languages.",
    tag: "BUILT FOR EVERYONE",
  },
  {
    icon: FileCheck2,
    title: "A clearer picture of you",
    text: "Your symptoms and records, together for your doctor.",
    tag: "DOCTOR-READY SUMMARY",
  },
];
export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav wrap">
        <Logo />
        <nav>
          <a href="#how-it-works">How it works</a>
          <a href="#care">Made for you</a>
          <Link to="/login/doctor">
            For doctors <ArrowUpRight size={15} />
          </Link>
        </nav>
        <Link className="btn outline" to="/login/patient">
          Patient login <ArrowRight size={16} />
        </Link>
      </header>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <Badge>
              <span className="status-dot" /> A little understanding. Better
              care.
            </Badge>
            <h1>
              Your health story.
              <br />
              <span>Your own voice.</span>
            </h1>
            <p className="hero-description">
              Simple for patients. Powerful for doctors.
              <br />
              An easier way to share how you feel, in the language you’re most
              comfortable with.
            </p>
            <div className="hero-actions">
              <Link className="btn large" to="/register">
                Start your health journey <ArrowRight size={19} />
              </Link>
              <Link className="text-link" to="/login/patient">
                Explore patient demo <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="hero-trust">
              <ShieldCheck size={18} />
              <span>Your information, shared with your consent</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="hero-image-holder">
              <img
                src="/care-illustration.png"
                alt="A doctor listening to a patient"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="hero-image-fallback" aria-hidden="true">
                <HeartPulse size={100} />
                <span>
                  Care begins
                  <br />
                  with listening.
                </span>
              </div>
            </div>
            <div className="floating-card understood">
              <span className="round-check">
                <Check size={18} />
              </span>
              <div>
                <strong>Heard. Understood. Cared for.</strong>
                <small>A health story that feels like you.</small>
              </div>
            </div>
            <div className="floating-card voice-card">
              <span className="voice-icon">
                <Mic size={22} />
              </span>
              <div>
                <strong>We’re listening</strong>
                <div className="waveform">
                  {[12, 22, 16, 32, 23, 40, 25, 16, 29, 18, 10, 20].map(
                    (h, i) => (
                      <i key={i} style={{ height: h }} />
                    ),
                  )}
                </div>
              </div>
            </div>
            <span className="art-caption">CARE THAT CONNECTS US</span>
          </div>
        </section>
        <section className="language-strip">
          <div className="wrap">
            <span>
              Many languages.
              <br />
              <strong>One shared understanding.</strong>
            </span>
            <div>English</div>
            <div>தமிழ்</div>
            <div>हिन्दी</div>
            <div>తెలుగు</div>
            <div>മലയാളം</div>
            <Badge tone="blue">5 languages, one caring space</Badge>
          </div>
        </section>
        <section className="wrap features-section" id="care">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A LITTLE SIMPLER, AT EVERY STEP</p>
              <h2>Care starts with being understood.</h2>
            </div>
            <p>
              Thoughtfully made for you,
              <br />
              and everyone who cares for you.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text, tag }, i) => (
              <article className="feature-card" key={title}>
                <span className={`icon-box ${["blue", "teal", "violet"][i]}`}>
                  <Icon size={25} />
                </span>
                <span className="feature-number">0{i + 1}</span>
                <p className="eyebrow">{tag}</p>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="wrap journey-section" id="how-it-works">
          <div>
            <p className="eyebrow">FROM YOU TO YOUR DOCTOR</p>
            <h2>
              A connected journey.
              <br />A more personal conversation.
            </h2>
            <p className="muted">
              Share at your pace. Check what we understood.
              <br />
              Walk into your consultation feeling prepared.
            </p>
            <Link className="text-link" to="/register">
              Let’s get started <ArrowRight size={18} />
            </Link>
          </div>
          <div className="journey-list">
            {[
              [
                "01",
                "Tell your story",
                "Speak, tap, or ask someone to help.",
                Mic,
              ],
              [
                "02",
                "Make sure it feels right",
                "Review your summary and add your records.",
                FileCheck2,
              ],
              [
                "03",
                "Connect with your doctor",
                "Your care team gets the complete picture.",
                Stethoscope,
              ],
            ].map(([n, title, text, Icon]) => (
              <div className="journey-item" key={n}>
                <span className="journey-num">{n}</span>
                <span className="icon-box">
                  <Icon size={22} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="wrap doctor-band">
          <div className="doctor-band-icon">
            <Stethoscope size={32} />
          </div>
          <div>
            <p className="eyebrow">FOR THE PEOPLE WHO CARE</p>
            <h2>
              Less time piecing things together.
              <br />
              More time with your patient.
            </h2>
          </div>
          <Link className="btn white" to="/login/doctor">
            Explore doctor workspace <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="wrap landing-footer">
        <Logo />
        <p>Designed around people. Connected by care.</p>
        <Badge tone="neutral">Interactive prototype · Demo data only</Badge>
      </footer>
    </div>
  );
}
