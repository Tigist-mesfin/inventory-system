"use client";

import { useState, type FormEvent } from "react";
import { COMPANY } from "@/lib/site";

type FormState = {
  name: string;
  businessName: string;
  contact: string;
  businessType: string;
  message: string;
};

const initial: FormState = {
  name: "",
  businessName: "",
  contact: "",
  businessType: "",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setReady(false);
    setError(null);
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Please enter your name.";
    if (!form.businessName.trim()) return "Please enter your business name.";
    if (!form.contact.trim()) return "Please enter a phone number or email.";
    if (!form.businessType.trim()) return "Please enter your business type.";
    if (!form.message.trim() || form.message.trim().length < 10) {
      return "Please include a short message (at least 10 characters).";
    }
    return null;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setReady(false);
      return;
    }

    const subject = encodeURIComponent(
      `Nigd Stock demo request — ${form.businessName.trim()}`,
    );
    const body = encodeURIComponent(
      [
        `Name: ${form.name.trim()}`,
        `Business name: ${form.businessName.trim()}`,
        `Phone or email: ${form.contact.trim()}`,
        `Business type: ${form.businessType.trim()}`,
        "",
        "Message:",
        form.message.trim(),
      ].join("\n"),
    );

    setReady(true);
    window.location.href = `mailto:${COMPANY.email}?subject=${subject}&body=${body}`;
  }

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

  return (
    <form
      id="demo"
      onSubmit={onSubmit}
      className="card-surface scroll-mt-28 space-y-4 p-5 sm:p-6"
      noValidate
    >
      <div>
        <h3 className="text-xl font-semibold text-navy-900">Request a demo</h3>
        <p className="mt-2 text-sm text-muted">
          This website has no backend form processor. When you submit, your email
          application opens with a prepared message to{" "}
          <a
            className="font-medium text-green-700 underline-offset-2 hover:underline"
            href={`mailto:${COMPANY.email}`}
          >
            {COMPANY.email}
          </a>
          . You must send the email yourself. Nothing is stored on this site.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-navy-900">
          Name
          <input
            className={fieldClass}
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-navy-900">
          Business name
          <input
            className={fieldClass}
            name="businessName"
            autoComplete="organization"
            value={form.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            required
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-navy-900">
          Phone or email
          <input
            className={fieldClass}
            name="contact"
            autoComplete="email"
            value={form.contact}
            onChange={(e) => update("contact", e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-navy-900">
          Business type
          <input
            className={fieldClass}
            name="businessType"
            placeholder="Retail, wholesale, warehouse…"
            value={form.businessType}
            onChange={(e) => update("businessType", e.target.value)}
            required
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-navy-900">
        Message
        <textarea
          className={`${fieldClass} min-h-28 resize-y`}
          name="message"
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          required
        />
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {ready ? (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          Your email application should open next. If it does not, email us
          directly at {COMPANY.email}. This site does not confirm delivery.
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary w-full sm:w-auto">
        Prepare email to request a demo
      </button>
    </form>
  );
}
