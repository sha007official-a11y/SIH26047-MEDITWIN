import React from "react";
import { Check, UserRound } from "lucide-react";
import { localOption } from "../lib/languages";
export default function BodyMap({ value, onChange, language = "English" }) {
  const selected = (r) => (value === r ? "#2397de" : "#cfe7f7"),
    stroke = (r) => (value === r ? "#087bbd" : "#7bb5da");
  function region(name, shape) {
    return (
      <g
        role="button"
        tabIndex="0"
        aria-label={`Select ${name}`}
        aria-pressed={value === name}
        onClick={() => onChange(name)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange(name);
          }
        }}
        className="body-region"
        fill={selected(name)}
        stroke={stroke(name)}
        strokeWidth="1.6"
      >
        {shape}
      </g>
    );
  }
  return (
    <div className="body-map">
      <div className="body-visual">
        <span className="body-view-label">
          {value === "Back" ? "BACK VIEW" : "FRONT VIEW"}
        </span>
        <svg
          viewBox="0 0 230 400"
          aria-label="Interactive body map"
          className="body-svg"
        >
          <defs>
            <linearGradient id="body-bg" x2="0" y2="1">
              <stop stopColor="#f6fbff" />
              <stop offset="1" stopColor="#e9f5ff" />
            </linearGradient>
          </defs>
          <ellipse cx="115" cy="375" rx="65" ry="11" fill="#d9ebf5" />
          {region(
            "Head",
            <>
              <ellipse cx="115" cy="49" rx="27" ry="34" />
              <path d="M105 81v15h20V81" />
            </>,
          )}
          {region(
            value === "Back" ? "Back" : "Chest",
            <path d="M105 91 78 101 67 158 76 198 94 188h42l18 10 9-40-11-57-27-10Z" />,
          )}
          {region(
            "Stomach",
            <path d="M76 179 94 181h42l18-2-3 54-12 18H91l-12-18Z" />,
          )}
          {region(
            "Other",
            <>
              <path d="m79 102-13 5-17 58-18 54 10 6 27-49 17-45Z" />
              <path d="m151 102 13 5 17 58 18 54-10 6-27-49-17-45Z" />
              <path d="m31 219-8 13 2 20 8 1 8-28m158-6 8 13-2 20-8 1-8-28" />
            </>,
          )}
          {region(
            "Legs",
            <>
              <path d="M80 229 113 241 110 298 103 357 80 357 83 301Z" />
              <path d="m117 241 33-12-3 72 3 56h-23l-7-59Z" />
              <path d="m80 357-10 12q15 10 32 2l1-14Zm47 0 1 14q17 8 32-2l-10-12Z" />
            </>,
          )}
          {value && value !== "Other" && (
            <circle
              cx={115}
              cy={
                { Head: 48, Chest: 136, Stomach: 213, Back: 145, Legs: 303 }[
                  value
                ]
              }
              r="5"
              fill="white"
              stroke="#087c88"
              strokeWidth="3"
            />
          )}
        </svg>
        <p>Tap a highlighted area or choose a button.</p>
      </div>
      <div className="body-options">
        {["Head", "Chest", "Stomach", "Back", "Legs", "Other"].map(
          (part, i) => (
            <button
              key={part}
              className={`choice-row ${value === part ? "selected" : ""}`}
              onClick={() => onChange(part)}
              aria-pressed={value === part}
            >
              <span className="body-part-num">0{i + 1}</span>
              <strong>{localOption(language, part)}</strong>
              {value === part ? (
                <Check size={18} />
              ) : (
                <span className="radio-circle" />
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
