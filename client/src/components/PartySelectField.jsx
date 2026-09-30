import { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * Registered list vs walk-in party picker.
 * - If options are empty: forces walk-in, shows disabled select + Register link.
 * - If options exist: shows select + walk-in checkbox (no register button).
 */
export default function PartySelectField({
  options = [],
  party,
  onPartyChange,
  valueId = "",
  onValueIdChange,
  walkInName = "",
  onWalkInNameChange,
  walkInPhone = "",
  onWalkInPhoneChange,
  showWalkInPhone = false,
  selectLabel = "From list",
  walkInLabel = "Walk-in",
  walkInNameLabel = "Walk-in name",
  walkInPlaceholder = "Enter name",
  emptySelectText = "No records yet",
  registerTo = "",
  registerLabel = "Register new",
  showRegisterWhenEmpty = true,
  required = true,
}) {
  const hasOptions = options.length > 0;
  const useWalkIn = party === "walkin" || !hasOptions;
  const showRegister = !hasOptions && showRegisterWhenEmpty && Boolean(registerTo);

  useEffect(() => {
    if (!hasOptions && party !== "walkin") {
      onPartyChange?.("walkin");
    }
  }, [hasOptions, party, onPartyChange]);

  return (
    <div className="party-select-field">
      {hasOptions ? (
        <label className="check-inline party-walkin-check">
          <input
            type="checkbox"
            checked={useWalkIn}
            onChange={(e) => {
              const next = e.target.checked ? "walkin" : "registered";
              onPartyChange?.(next);
              if (next === "registered") {
                onWalkInNameChange?.("");
                onWalkInPhoneChange?.("");
              }
              if (next === "walkin") onValueIdChange?.("");
            }}
          />
          <span>{walkInLabel}</span>
        </label>
      ) : null}

      {!useWalkIn ? (
        <label className="field">
          <span className="party-select-label-row">
            <span>{selectLabel}</span>
          </span>
          <select
            value={valueId}
            onChange={(e) => onValueIdChange?.(e.target.value)}
            required={required}
          >
            <option value="">Select {selectLabel.toLowerCase()}</option>
            {options.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label || row.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          {!hasOptions ? (
            <label className="field">
              <span className="party-select-label-row">
                <span>{selectLabel}</span>
                {showRegister ? (
                  <Link className="party-register-link" to={registerTo}>
                    {registerLabel}
                  </Link>
                ) : null}
              </span>
              <select disabled value="">
                <option value="">{emptySelectText}</option>
              </select>
              <small className="muted">
                No {selectLabel.toLowerCase()} registered yet. Enter a walk-in name below
                {showRegister ? (
                  <>
                    , or <Link to={registerTo}>{registerLabel.toLowerCase()}</Link>
                  </>
                ) : null}
                .
              </small>
            </label>
          ) : null}

          <label className="field">
            <span>{walkInNameLabel}</span>
            <input
              value={walkInName}
              onChange={(e) => onWalkInNameChange?.(e.target.value)}
              placeholder={walkInPlaceholder}
              required={required}
            />
          </label>
          {showWalkInPhone ? (
            <label className="field">
              <span>Phone</span>
              <input
                value={walkInPhone}
                onChange={(e) => onWalkInPhoneChange?.(e.target.value)}
                placeholder="Phone number"
                required={required}
              />
            </label>
          ) : null}
        </>
      )}
    </div>
  );
}
