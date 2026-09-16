import React, { useRef, useState, useEffect } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "./ui";
import { languages, t } from "../lib/languages";
export function VoiceInput({ language, onText }) {
  const [recording, setRecording] = useState(false),
    [error, setError] = useState(""),
    recognition = useRef(null);
  const supported = !!(
    window.SpeechRecognition || window.webkitSpeechRecognition
  );
  useEffect(() => () => recognition.current?.abort(), []);
  function start() {
    if (recording) {
      recognition.current?.stop();
      setRecording(false);
      return;
    }
    if (!supported) {
      setError(
        "Voice input is not supported in this browser. Please type or tap your answer.",
      );
      return;
    }
    setError("");
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new Recognition();
    r.lang = languages.find((x) => x.name === language)?.locale || "en-IN";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      onText(
        Array.from(e.results)
          .map((x) => x[0].transcript)
          .join(" "),
      );
    };
    r.onend = () => setRecording(false);
    r.onerror = (e) => {
      setRecording(false);
      setError(
        e.error === "not-allowed"
          ? "Microphone access was declined. You can type or tap instead."
          : "We couldn’t hear you clearly. Try again, or type your answer.",
      );
    };
    recognition.current = r;
    try {
      r.start();
      setRecording(true);
    } catch {
      setRecording(false);
      setError("Microphone unavailable. Please use text input.");
    }
  }
  return (
    <div className="voice-control">
      <Button
        variant={recording ? "danger" : "secondary"}
        icon={recording ? MicOff : Mic}
        onClick={start}
      >
        {recording ? "Listening… tap to stop" : t(language, "speak")}
      </Button>
      <small>
        {recording
          ? "Your words will appear in the answer box."
          : "Review your words before continuing."}
      </small>
      {error && (
        <p role="status" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
export function ReadAloud({ text, language }) {
  const [error, setError] = useState("");
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  function speak() {
    if (!window.speechSynthesis) {
      setError("Audio is unavailable in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = languages.find((x) => x.name === language)?.locale || "en-IN";
    u.rate = 0.85;
    u.onerror = () =>
      setError("No matching voice is available. You can read the question.");
    window.speechSynthesis.speak(u);
  }
  return (
    <>
      <button className="text-link" onClick={speak}>
        <Volume2 size={17} />
        {t(language, "listen")}
      </button>
      {error && <small role="status">{error}</small>}
    </>
  );
}
