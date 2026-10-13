import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { accountApi } from "../../services/api/accountApi";
import {
  IconCamera,
  IconCheck,
  IconCreditCard,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconShield,
  IconUser,
} from "../../components/Icons";

const inputClass =
  "w-full px-3 py-2.5 border border-border rounded-md bg-white text-sm text-text-primary focus:outline-none focus:border-primary-500";
const buttonClass =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50";
const cardClass =
  "rounded-lg border border-border bg-white p-5 shadow-sm sm:p-6";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAuth();
  const isCustomer = currentUser?.role === "CUSTOMER";
  const [section, setSection] = useState(isCustomer ? "personal" : "password");
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    avatar_url: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [emailOtpRequested, setEmailOtpRequested] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpCooldown, setEmailOtpCooldown] = useState(0);
  const [emailChangeError, setEmailChangeError] = useState("");
  const [emailChangeNotice, setEmailChangeNotice] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const emailChangeButtonRef = useRef(null);
  const emailChangeDialogRef = useRef(null);
  const newEmailInputRef = useRef(null);
  const emailOtpInputRef = useRef(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requestData = useCallback(async () => {
    const profileResponse = await accountApi.getProfile();
    return {
      profile: {
        full_name: profileResponse.data.full_name || "",
        email: profileResponse.data.email || "",
        phone: profileResponse.data.phone || "",
        address: profileResponse.data.address || "",
        avatar_url: profileResponse.data.avatar_url || "",
        role: profileResponse.data.role || currentUser?.role || "",
        is_verified: Boolean(profileResponse.data.is_verified),
      },
    };
  }, [currentUser?.role]);

  const cancelEmailChange = () => {
    setEmailChangeOpen(false);
    setEmailOtpRequested(false);
    setNewEmail("");
    setEmailOtp("");
    setEmailOtpCooldown(0);
    setEmailChangeError("");
    setEmailChangeNotice("");
    setError("");
    setNotice("");
    window.requestAnimationFrame(() => emailChangeButtonRef.current?.focus());
  };

  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  useEffect(() => {
    if (!emailChangeOpen) return undefined;
    (emailOtpRequested
      ? emailOtpInputRef.current
      : newEmailInputRef.current
    )?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !saving) cancelEmailChange();
      if (event.key === "Tab") {
        const focusable = emailChangeDialogRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [emailChangeOpen, emailOtpRequested, saving]);

  const hasEmailOtpCooldown = emailOtpCooldown > 0;
  useEffect(() => {
    if (!hasEmailOtpCooldown) return undefined;
    const timer = window.setInterval(() => {
      setEmailOtpCooldown((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasEmailOtpCooldown]);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const data = await requestData();
        if (active) {
          setProfile(data.profile);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInitialData();
    return () => {
      active = false;
    };
  }, [requestData]);

  const showResult = (message) => {
    setError("");
    setNotice(message);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await accountApi.updateProfile({
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
      });
      setProfile((previous) => ({ ...previous, ...response.data }));
      updateCurrentUser(response.data);
      showResult("Personal information saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await accountApi.uploadAvatar(avatarFile);
      setProfile((previous) => ({ ...previous, ...response.data }));
      updateCurrentUser(response.data);
      setAvatarFile(null);
      setAvatarPreview("");
      showResult("Avatar updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAvatar = async () => {
    if (!window.confirm("Remove your saved profile photo?")) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await accountApi.deleteAvatar();
      setProfile((previous) => ({ ...previous, ...response.data }));
      updateCurrentUser(response.data);
      setAvatarFile(null);
      setAvatarPreview("");
      showResult("Avatar removed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectAvatar = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setNotice("");
    setError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const requestEmailOtp = async (event) => {
    event?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setEmailChangeError("Enter a valid new email address.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    setEmailChangeError("");
    setEmailChangeNotice("");
    try {
      const response = await accountApi.requestEmailChange(newEmail.trim());
      setEmailOtpRequested(true);
      setEmailOtpCooldown(response.data?.resendAfterSeconds || 60);
      setEmailChangeNotice(
        response.message || "Verification code sent to the new email.",
      );
    } catch (err) {
      setEmailChangeError(err.message);
      if (err.retryAfterSeconds) setEmailOtpCooldown(err.retryAfterSeconds);
    } finally {
      setSaving(false);
    }
  };

  const verifyEmailOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(emailOtp)) {
      setEmailChangeError("Enter the 6-digit verification code.");
      return;
    }
    setSaving(true);
    setEmailChangeError("");
    setEmailChangeNotice("");
    try {
      const response = await accountApi.verifyEmailChange(emailOtp);
      setProfile((previous) => ({ ...previous, ...response.data }));
      updateCurrentUser(response.data);
      setEmailChangeOpen(false);
      setEmailOtpRequested(false);
      setNewEmail("");
      setEmailOtp("");
      setEmailOtpCooldown(0);
      setEmailChangeError("");
      setEmailChangeNotice("");
      showResult("Email address verified and updated.");
    } catch (err) {
      setEmailChangeError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError("Enter your current and new password.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setError("New password must differ from your current password.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }
    setSaving(true);
    try {
      await accountApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showResult("Password changed successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <main className="h-full overflow-y-auto bg-bg-default px-4 py-8 sm:px-8">
        <div
          className="mx-auto max-w-5xl animate-pulse space-y-5"
          aria-label="Loading profile"
        >
          <div className="h-8 w-56 rounded-md bg-sidebar-100" />
          <div className="h-32 rounded-lg border border-border bg-white" />
          <div className="h-14 rounded-lg bg-sidebar-100" />
          <div className="h-64 rounded-lg border border-border bg-white" />
        </div>
      </main>
    );

  const sections = [
    ...(isCustomer
      ? [
          { id: "personal", label: "Personal Information" },
          { id: "payments", label: "Payment Methods" },
        ]
      : []),
    { id: "password", label: "Security & Password" },
  ];

  return (
    <main className="h-full overflow-y-auto bg-bg-default px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mb-3 text-xs font-semibold text-primary-600 hover:underline"
            >
              Back to Travelio
            </button>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-600">
              Account settings
            </p>
            <h1 className="mt-1 text-2xl font-bold text-text-primary">
              Profile &amp; Security
            </h1>
          </div>
          <p className="text-sm text-text-secondary">{currentUser?.email}</p>
        </div>

        <section
          className={`${cardClass} mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-primary-100">
              {avatarPreview || profile.avatar_url ? (
                <img
                  src={avatarPreview || profile.avatar_url}
                  alt="Account avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary-700">
                  {profile.full_name ? (
                    <span className="text-2xl font-bold">
                      {profile.full_name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <IconUser size={30} />
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-text-primary">
                {profile.full_name || "Account profile"}
              </h2>
              <p className="mt-0.5 truncate text-sm text-text-secondary">
                {profile.email || currentUser?.email}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold uppercase text-primary-700">
                  {profile.role || currentUser?.role}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${profile.is_verified ? "bg-success-100 text-success-700" : "bg-warning-100 text-warning-700"}`}
                >
                  {profile.is_verified ? (
                    <IconCheck size={12} />
                  ) : (
                    <IconMail size={12} />
                  )}
                  {profile.is_verified
                    ? "Email verified"
                    : "Email not verified"}
                </span>
              </div>
            </div>
          </div>
          {isCustomer && (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <label className={`${buttonClass} cursor-pointer`}>
                <IconCamera size={16} />
                {avatarFile ? "Choose another" : "Upload photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={selectAvatar}
                  disabled={saving}
                />
              </label>
              {avatarFile && (
                <button
                  type="button"
                  onClick={uploadAvatar}
                  disabled={saving}
                  className={buttonClass}
                >
                  {saving ? "Uploading..." : "Save photo"}
                </button>
              )}
              {avatarFile && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarPreview("");
                    setError("");
                  }}
                  disabled={saving}
                  className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary disabled:opacity-50"
                >
                  Discard preview
                </button>
              )}
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={saving}
                  className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-danger-500 hover:text-danger-500 disabled:opacity-50"
                >
                  Remove photo
                </button>
              )}
              {avatarFile && (
                <span className="w-full text-xs text-text-secondary sm:text-right">
                  Preview only · not saved yet
                </span>
              )}
            </div>
          )}
        </section>

        <nav
          className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-border bg-white p-1 shadow-sm"
          aria-label="Profile sections"
        >
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`whitespace-nowrap rounded-md px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 ${section === item.id ? "bg-primary-50 text-primary-700" : "text-text-secondary hover:bg-sidebar-50 hover:text-text-primary"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {error && (
          <div
            role="alert"
            className="mb-5 border border-danger-500/30 bg-danger-100 px-4 py-3 text-sm text-danger-500"
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="mb-5 border border-success-500/30 bg-success-100 px-4 py-3 text-sm text-success-700"
          >
            {notice}
          </div>
        )}

        {section === "personal" && isCustomer && (
          <section className={`${cardClass} max-w-3xl`}>
            <div className="mb-6 flex items-start gap-3">
              <div className="rounded-md bg-primary-50 p-2 text-primary-600">
                <IconUser size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Personal Information
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Manage the contact details used for your Travelio account.
                </p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold text-text-primary">
                Full name
                <input
                  required
                  maxLength={120}
                  className={`${inputClass} mt-1.5`}
                  value={profile.full_name}
                  onChange={(event) =>
                    setProfile({ ...profile, full_name: event.target.value })
                  }
                />
              </label>
              <div>
                <label
                  className="text-sm font-semibold text-text-primary"
                  htmlFor="profile-email"
                >
                  Email address
                </label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="profile-email"
                    type="email"
                    readOnly
                    className={`${inputClass} min-w-0 flex-1 bg-slate-50 text-text-secondary`}
                    value={profile.email}
                  />
                  {!emailChangeOpen && (
                    <button
                      ref={emailChangeButtonRef}
                      type="button"
                      onClick={() => {
                        setEmailChangeOpen(true);
                        setNotice("");
                        setError("");
                        setEmailChangeError("");
                        setEmailChangeNotice("");
                      }}
                      className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-semibold text-primary-700 transition hover:border-primary-500 hover:bg-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                    >
                      Change email
                    </button>
                  )}
                </div>
              </div>
              <label className="text-sm font-semibold text-text-primary">
                Phone
                <input
                  maxLength={30}
                  className={`${inputClass} mt-1.5`}
                  value={profile.phone}
                  onChange={(event) =>
                    setProfile({ ...profile, phone: event.target.value })
                  }
                />
              </label>
              <label className="text-sm font-semibold text-text-primary">
                Address
                <input
                  maxLength={500}
                  className={`${inputClass} mt-1.5`}
                  value={profile.address}
                  onChange={(event) =>
                    setProfile({ ...profile, address: event.target.value })
                  }
                />
              </label>
              <div className="sm:col-span-2">
                <button className={buttonClass} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
            {emailChangeOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 px-4 py-6"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !saving) {
                    cancelEmailChange();
                  }
                }}
              >
                <form
                  ref={emailChangeDialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="email-change-title"
                  aria-describedby="email-change-description"
                  onSubmit={
                    emailOtpRequested ? verifyEmailOtp : requestEmailOtp
                  }
                  onMouseDown={(event) => event.stopPropagation()}
                  className="my-auto w-full max-w-lg rounded-lg border border-border bg-white p-5 shadow-xl sm:p-7"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-primary-600">
                        Account security
                      </p>
                      <h2
                        id="email-change-title"
                        className="mt-1 text-xl font-bold text-text-primary"
                      >
                        {emailOtpRequested
                          ? "Verify new email"
                          : "Change email"}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={cancelEmailChange}
                      disabled={saving}
                      aria-label="Close dialog"
                      className="rounded-md p-2 text-text-secondary hover:bg-sidebar-50 hover:text-text-primary disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                  <p
                    id="email-change-description"
                    className="mb-5 text-sm leading-relaxed text-text-secondary"
                  >
                    {emailOtpRequested
                      ? `Enter the six-digit code sent to ${newEmail}. Your current email stays active until verification.`
                      : "We will send a six-digit verification code to the new address. Your current email will not change until you verify it."}
                  </p>
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-text-primary">
                      New email address
                      <input
                        ref={newEmailInputRef}
                        type="email"
                        required
                        disabled={emailOtpRequested || saving}
                        className={`${inputClass} mt-1.5 disabled:bg-slate-50`}
                        value={newEmail}
                        onChange={(event) => setNewEmail(event.target.value)}
                        autoComplete="email"
                      />
                    </label>
                    {emailOtpRequested && (
                      <label className="block text-sm font-semibold text-text-primary">
                        6-digit verification code
                        <input
                          ref={emailOtpInputRef}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          required
                          disabled={saving}
                          className={`${inputClass} mt-1.5 max-w-xs text-center text-lg tracking-[0.25em] disabled:opacity-60`}
                          value={emailOtp}
                          onChange={(event) =>
                            setEmailOtp(
                              event.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                  {emailChangeError && (
                    <p
                      role="alert"
                      className="mt-4 rounded-md border border-danger-500/30 bg-danger-100 px-3 py-2 text-sm text-danger-500"
                    >
                      {emailChangeError}
                    </p>
                  )}
                  {emailChangeNotice && (
                    <p
                      role="status"
                      className="mt-4 rounded-md border border-success-500/30 bg-success-100 px-3 py-2 text-sm text-success-700"
                    >
                      {emailChangeNotice}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      disabled={
                        saving || (emailOtpRequested && emailOtp.length !== 6)
                      }
                      className={buttonClass}
                    >
                      {saving
                        ? "Working..."
                        : emailOtpRequested
                          ? "Verify email"
                          : "Send OTP"}
                    </button>
                    {emailOtpRequested && (
                      <button
                        type="button"
                        disabled={saving || emailOtpCooldown > 0}
                        onClick={() => requestEmailOtp()}
                        className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {emailOtpCooldown > 0
                          ? `Resend in ${Math.floor(emailOtpCooldown / 60)}:${String(emailOtpCooldown % 60).padStart(2, "0")}`
                          : "Resend code"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={cancelEmailChange}
                      disabled={saving}
                      className="rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        )}

        {section === "payments" && isCustomer && (
          <section className={`${cardClass} max-w-3xl`}>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary-50 p-2 text-primary-600">
                <IconCreditCard size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Payment Methods
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Manage your saved payment options when this feature becomes
                  available.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center rounded-md border border-dashed border-border bg-sidebar-50 px-5 py-9 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-text-secondary shadow-sm">
                <IconCreditCard size={22} />
              </div>
              <p className="font-semibold text-text-primary">
                No payment methods added yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-text-secondary">
                Saved payment method management is not available in this phase.
              </p>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="mt-5 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add payment method · Coming soon
              </button>
            </div>
          </section>
        )}

        {section === "password" && (
          <section className={`${cardClass} max-w-3xl`}>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary-50 p-2 text-primary-600">
                  <IconShield size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Security &amp; Password
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Keep your account secure with a strong password.
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${profile.is_verified ? "bg-success-100 text-success-700" : "bg-warning-100 text-warning-700"}`}
              >
                {profile.is_verified ? (
                  <IconCheck size={14} />
                ) : (
                  <IconMail size={14} />
                )}
                {profile.is_verified ? "Email verified" : "Email not verified"}
              </span>
            </div>
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPasswords((visible) => !visible)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-sidebar-50 hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
              >
                {showPasswords ? (
                  <IconEyeOff size={14} />
                ) : (
                  <IconEye size={14} />
                )}
                {showPasswords ? "Hide passwords" : "Show passwords"}
              </button>
            </div>
            <form onSubmit={changePassword} className="space-y-4">
              <label className="block text-sm font-semibold text-text-primary">
                Current password
                <div className="relative mt-1.5">
                  <IconLock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    required
                    type={showPasswords ? "text" : "password"}
                    autoComplete="current-password"
                    className={`${inputClass} pl-10 pr-4`}
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: event.target.value,
                      })
                    }
                  />
                </div>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-text-primary">
                  New password
                  <input
                    required
                    minLength={8}
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    className={`${inputClass} mt-1.5`}
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: event.target.value,
                      })
                    }
                  />
                  <span className="mt-1 block text-xs font-normal text-text-secondary">
                    At least 8 characters
                  </span>
                </label>
                <label className="block text-sm font-semibold text-text-primary">
                  Confirm new password
                  <input
                    required
                    minLength={8}
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    className={`${inputClass} mt-1.5`}
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <button className={buttonClass} disabled={saving}>
                {saving ? "Updating..." : "Change password"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
