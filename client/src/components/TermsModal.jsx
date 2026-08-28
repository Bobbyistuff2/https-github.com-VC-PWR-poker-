import { useState } from 'react';
import { api } from '../api.js';
import './TermsModal.css';

// Everyone who signs in has to pass through this once (see the gate check in
// App.jsx) before the terms_accepted_at column on their row is ever set —
// after that it's just readable from Settings. Styled deliberately plain and
// document-like (not the app's usual gold/dark game chrome) so it reads as a
// serious legal document rather than another piece of the game UI, even
// though this is a hobby project and nothing here is enforced by a lawyer
// anywhere.
const EFFECTIVE_DATE = 'August 28, 2026';

const SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    body:
      'By creating an account and using PWR Poker ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must decline below, and you will be signed out. You may not use the Platform without accepting these Terms.',
  },
  {
    heading: '2. Eligibility',
    body:
      'You must be at least 18 years of age, or the age of majority in your jurisdiction, whichever is greater, to create an account. By using the Platform, you represent and warrant that you meet this requirement and that your participation in the games offered here is lawful in the jurisdiction in which you reside.',
  },
  {
    heading: '3. Real-Money Cash Games; Assumption of Financial Responsibility',
    body:
      'Cash Games tables are played for real monetary stakes. You acknowledge and agree that you are solely and personally responsible for any real money you deposit, wager, lose, or otherwise place at risk while participating in Cash Games. The Platform makes no guarantee of winnings of any kind, provides no refunds for losses incurred through play, and disclaims all liability for financial loss arising from gameplay, technical error, disconnection, or decisions made by you at the table. You should not wager funds you cannot afford to lose.',
  },
  {
    heading: '4. Virtual Chips, Wheel Prizes, and Rank Points',
    body:
      'Chips awarded through Quick Games, Tournaments, or the Rewards wheel, and any rank, badge, or leaderboard standing derived from them, have no monetary value, cannot be redeemed, exchanged, gifted, transferred, or sold for real money or any other consideration, and are provided solely for entertainment and in-app progression.',
  },
  {
    heading: '5. Fair Play and Anti-Cheating',
    body:
      'Collusion between players, chip dumping, the use of bots, solvers, or other assistive software, operation of multiple accounts by a single individual, and exploitation of software defects are each strictly prohibited. A violation of this section may result in forfeiture of chips or balance, the voiding of hand results, and permanent termination of your account without prior notice.',
  },
  {
    heading: '6. Account Security',
    body:
      'You are solely responsible for maintaining the security and confidentiality of the third-party Google or Discord account used to authenticate with the Platform. The Platform disclaims liability for any loss arising from unauthorized access to your account resulting from your failure to secure your login credentials.',
  },
  {
    heading: '7. Prohibited Conduct',
    body:
      'You agree not to harass or abuse other users, adopt an offensive display name or image, interfere with or disrupt operation of the Platform, including by denial-of-service activity or unauthorized data scraping, or reverse-engineer any portion of the Platform for the purpose of gaining an unfair advantage.',
  },
  {
    heading: '8. Suspension and Termination',
    body:
      'The Platform reserves the right to suspend or terminate your account at any time, with or without cause, and with or without prior notice, including for any actual or suspected violation of these Terms. You may discontinue use of the Platform at any time by signing out of your account.',
  },
  {
    heading: '9. Disclaimer of Warranties',
    body:
      'The Platform is provided on an "as is" and "as available" basis, without warranties of any kind, whether express or implied, including any warranty of uninterrupted availability, error-free operation, or that card shuffling, dealing, or other game outcomes will be free from software defect.',
  },
  {
    heading: '10. Limitation of Liability',
    body:
      'To the fullest extent permitted by applicable law, the Platform and its operator shall not be liable for any indirect, incidental, special, or consequential damages, including loss of chips, loss of winnings, or loss of real money, arising out of or in connection with your use of the Platform.',
  },
  {
    heading: '11. Amendment of These Terms',
    body:
      'These Terms may be revised from time to time at the Platform’s discretion. Continued use of the Platform following the posting of a revision constitutes your acceptance of the amended Terms.',
  },
  {
    heading: '12. Contact',
    body: 'Any questions regarding these Terms should be directed to the Platform operator.',
  },
];

export default function TermsModal({ variant = 'view', acceptedAt, onAccept, onDecline, onClose }) {
  const [checked, setChecked] = useState(variant === 'view');
  const [submitting, setSubmitting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const isGate = variant === 'gate';

  async function handleAccept() {
    setSubmitting(true);
    try {
      const { user } = await api.acceptTerms();
      onAccept(user);
    } catch {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    setDeclining(true);
    try {
      await api.logout();
    } finally {
      onDecline();
    }
  }

  return (
    <div className={`terms-backdrop ${isGate ? 'terms-backdrop--gate' : ''}`} onClick={isGate ? undefined : onClose}>
      <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
        {!isGate && (
          <button className="terms-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}

        <div className="terms-modal__header">
          <p className="terms-modal__eyebrow">PWR Poker</p>
          <h1>Terms of Service</h1>
          <p className="terms-modal__meta">Effective {EFFECTIVE_DATE}</p>
          {!isGate && acceptedAt && (
            <p className="terms-modal__meta terms-modal__meta--accepted">
              You accepted these terms on {new Date(acceptedAt).toLocaleDateString()}.
            </p>
          )}
        </div>

        <div className="terms-modal__body">
          <p className="terms-modal__intro">
            Please read the following Terms of Service carefully. They govern your access to and use of PWR
            Poker, and include, among other provisions, a section addressing your financial responsibility
            for real money wagered in Cash Games.
          </p>
          {SECTIONS.map((s) => (
            <section key={s.heading} className="terms-section">
              <h2>{s.heading}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>

        {isGate && (
          <div className="terms-modal__footer">
            <label className="terms-checkbox">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span>I have read, understood, and agree to be bound by the foregoing Terms of Service, including Section 3 concerning financial responsibility for real-money Cash Games.</span>
            </label>
            <div className="terms-modal__actions">
              <button className="terms-btn terms-btn--decline" onClick={handleDecline} disabled={declining || submitting}>
                {declining ? 'Signing out…' : 'Decline and Sign Out'}
              </button>
              <button
                className="terms-btn terms-btn--accept"
                onClick={handleAccept}
                disabled={!checked || submitting || declining}
              >
                {submitting ? 'Submitting…' : 'I Agree to the Terms of Service'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
