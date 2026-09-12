// The published LOIN legal documents, kept as plain data so both pages share
// one chalkboard renderer.

export interface LegalSection {
  heading?: string;
  /** Paragraphs; a line starting with "- " renders as a bullet. */
  body: string[];
}

export interface LegalDoc {
  title: string;
  effective: string;
  intro: string[];
  sections: LegalSection[];
  outro: string[];
}

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  effective: "Effective Date: August 10, 2026",
  intro: [
    'Thank you for using LOIN ("LOIN", "we", "our", or "us").',
    "LOIN is a focus and accountability application designed to help users eliminate distractions, commit to meaningful work, and build discipline through structured focus sessions.",
    "Your privacy is important to us. This Privacy Policy explains what information we collect, how we use it, how we protect it, and the choices available to you.",
    "By creating an account or using LOIN, you agree to the practices described in this Privacy Policy.",
  ],
  sections: [
    {
      heading: "1. Information We Collect",
      body: [
        "Account Information",
        "When you create an account, we may collect:",
        "- Name",
        "- Email address",
        "- Profile picture (if provided)",
        "- Authentication information",
        "If you sign in using Google, we receive information made available by your Google account, such as your name, email address, and profile picture.",
        "If you register using email and password, we collect your email address and securely store authentication credentials.",
        "Profile Information",
        "You may choose to upload:",
        "- Profile pictures",
        "- Display names",
        "This information is used only to personalize your account.",
        "Goal and Session Information",
        "To provide the core functionality of LOIN, we collect information including:",
        "- Goals you create",
        "- Session duration",
        "- Session history",
        "- Completion status",
        "- Ledger entries",
        "- Statistics",
        "- Broken promise count",
        "- Focus history",
        "Proof Submissions",
        "Depending on the unlock method you choose, LOIN may collect:",
        "- Photos uploaded as proof of work",
        "- Voice recordings (if supported in future versions)",
        "- Other proof required to verify task completion",
        "Proof submissions are used only for verification and improving the functionality of the app.",
        "Payment Information",
        'LOIN includes a "Pay to Escape" feature.',
        "Payments are processed through secure third-party payment providers.",
        "LOIN does not store your credit card numbers, debit card information, or other sensitive payment credentials.",
        "We may receive limited transaction information, such as whether a payment was successful.",
      ],
    },
    {
      heading: "2. AI Verification",
      body: [
        "LOIN uses artificial intelligence to assist in verifying:",
        "- User goals",
        "- Proof submissions",
        "- Images uploaded to complete sessions",
        "Images or other submitted content may be securely processed using trusted third-party AI services solely for verification purposes.",
        "AI verification is intended to assist users but may occasionally produce incorrect or incomplete results.",
        "Users remain responsible for the information they submit.",
      ],
    },
    {
      heading: "3. Permissions We Request",
      body: [
        "LOIN may request the following Android permissions.",
        "Camera",
        "Used to:",
        "- Capture proof photos",
        "- Upload profile pictures",
        "The camera is only accessed when initiated by you.",
        "Accessibility Service",
        "LOIN uses Android Accessibility Services to provide its core functionality.",
        "This permission is used to:",
        "- Help enforce focus sessions",
        "- Restrict access to non-whitelisted applications during active sessions",
        "Accessibility data is used only for these features and is not sold or used for advertising.",
        "Usage Access",
        "Usage Access allows LOIN to:",
        "- Detect which applications are opened",
        "- Enforce app restrictions during focus sessions",
        "This permission is required for LOIN's app-locking functionality.",
      ],
    },
    {
      heading: "4. Information We Do NOT Collect",
      body: [
        "LOIN does not collect:",
        "- Precise GPS location",
        "- Approximate location",
        "- Contacts",
        "- SMS messages",
        "- Call history",
        "- Microphone recordings (unless explicitly enabled in future versions)",
        "- Background location",
      ],
    },
    {
      heading: "5. How We Use Your Information",
      body: [
        "We use your information to:",
        "- Create and manage your account",
        "- Authenticate users",
        "- Provide focus sessions",
        "- Verify proof submissions",
        "- Improve AI verification",
        "- Maintain session history",
        "- Display statistics and the Ledger",
        "- Process Pay to Escape transactions",
        "- Improve security",
        "- Prevent abuse and fraud",
        "- Respond to support requests",
      ],
    },
    {
      heading: "6. Data Storage",
      body: [
        "LOIN stores user information using Supabase.",
        "We implement reasonable technical and organizational safeguards to protect your data.",
        "However, no online service can guarantee absolute security.",
      ],
    },
    {
      heading: "7. Data Sharing",
      body: [
        "We do not sell your personal information.",
        "We may share information only with trusted service providers necessary to operate LOIN, including:",
        "- Authentication providers",
        "- Cloud infrastructure providers",
        "- AI service providers",
        "- Payment providers",
        "These providers may access only the information necessary to perform their services.",
      ],
    },
    {
      heading: "8. Data Retention",
      body: [
        "We retain your information only for as long as necessary to:",
        "- Provide the service",
        "- Comply with legal obligations",
        "- Resolve disputes",
        "- Improve the application",
        "Proof submissions and account information may be deleted upon account deletion, subject to reasonable backup retention periods.",
      ],
    },
    {
      heading: "9. Account Deletion",
      body: [
        "You may permanently delete your account from within the application.",
        "Deleting your account will permanently remove your personal information and associated data, except where retention is required by law or for limited technical backup purposes.",
      ],
    },
    {
      heading: "10. Children's Privacy",
      body: [
        "LOIN is not intended for children under the age of 13.",
        "We do not knowingly collect personal information from children under 13.",
        "If we become aware that such information has been collected, we will take reasonable steps to delete it.",
      ],
    },
    {
      heading: "11. Security",
      body: [
        "We use reasonable administrative, technical, and organizational measures to protect user information.",
        "Despite our efforts, no internet transmission or electronic storage method can be guaranteed to be completely secure.",
      ],
    },
    {
      heading: "12. Your Rights",
      body: [
        "Depending on applicable law, you may have the right to:",
        "- Access your information",
        "- Correct inaccurate information",
        "- Delete your account",
        "- Request deletion of your personal data",
        "- Withdraw consent where applicable",
        "To exercise these rights, contact us using the email below.",
      ],
    },
    {
      heading: "13. Changes to this Privacy Policy",
      body: [
        "We may update this Privacy Policy from time to time.",
        "If significant changes are made, we will notify users through the application or by other appropriate means.",
        "Continued use of LOIN after changes become effective constitutes acceptance of the updated Privacy Policy.",
      ],
    },
    {
      heading: "14. Contact Us",
      body: [
        "If you have any questions about this Privacy Policy or our privacy practices, please contact:",
        "Email: barikimokshith@gmail.com",
      ],
    },
  ],
  outro: ["Thank you for trusting LOIN.", "Your discipline is yours.", "Your privacy is too."],
};

export const TERMS: LegalDoc = {
  title: "Terms & Conditions",
  effective: "Effective Date: August 10, 2026",
  intro: [
    'Welcome to LOIN ("LOIN", "we", "our", or "us").',
    'These Terms & Conditions ("Terms") govern your access to and use of the LOIN application and related services.',
    "By creating an account or using LOIN, you agree to be bound by these Terms.",
    "If you do not agree, please do not use the application.",
  ],
  sections: [
    {
      heading: "1. About LOIN",
      body: [
        "LOIN is a focus and accountability application designed to help users reduce distractions, complete meaningful work, and build discipline through structured focus sessions.",
        "LOIN is a productivity tool. It does not guarantee academic, professional, financial, or personal success.",
      ],
    },
    {
      heading: "2. Eligibility",
      body: [
        "You must be at least 13 years old to use LOIN.",
        "If you are under the age of majority in your jurisdiction, you should use LOIN with the permission of a parent or legal guardian.",
      ],
    },
    {
      heading: "3. Accounts",
      body: [
        "You are responsible for:",
        "- Maintaining the confidentiality of your account.",
        "- Keeping your password secure.",
        "- All activity that occurs under your account.",
        "You agree to provide accurate information when creating your account.",
        "You must not impersonate another person or create fraudulent accounts.",
      ],
    },
    {
      heading: "4. Focus Sessions",
      body: [
        "LOIN allows users to create focus sessions that may temporarily restrict access to selected applications using Android system permissions.",
        "Users are solely responsible for:",
        "- Choosing session duration.",
        "- Selecting whitelisted applications.",
        "- Selecting an unlock method.",
        "- Deciding when to begin a session.",
        "LOIN is not responsible for missed deadlines, incomplete work, or consequences resulting from user-created focus sessions.",
      ],
    },
    {
      heading: "5. AI Goal & Proof Verification",
      body: [
        "LOIN may use artificial intelligence to:",
        "- Refine user goals.",
        "- Evaluate proof submissions.",
        "- Assist in determining whether a submitted proof appears relevant to the user's stated objective.",
        "AI verification is intended to assist users only.",
        "Artificial intelligence may occasionally make mistakes.",
        "LOIN does not guarantee that AI decisions are always correct, complete, or suitable for every situation.",
        "Users remain responsible for the content they submit.",
      ],
    },
    {
      heading: "6. Proof Submissions",
      body: [
        "Users may submit photographs or other supported proof to complete a session.",
        "You confirm that:",
        "- The submitted content belongs to you or you have permission to use it.",
        "- The content does not violate any law.",
        "- The content does not infringe the rights of others.",
        "LOIN reserves the right to reject abusive or fraudulent submissions.",
      ],
    },
    {
      heading: "7. Pay to Escape",
      body: [
        "LOIN may allow users to end a focus session early by making a payment through an approved payment provider.",
        "By choosing this feature, you acknowledge that:",
        "- The payment is voluntary.",
        "- Charges may be non-refundable except where required by applicable law or the policies of the payment provider.",
        "- LOIN does not store your payment card information.",
        "Payment processing is handled by trusted third-party payment providers.",
      ],
    },
    {
      heading: "8. Accessibility Service & Usage Access",
      body: [
        "LOIN uses Android Accessibility Services and Usage Access solely to provide app-blocking and focus-session functionality.",
        "These permissions are used only for features you choose to enable.",
        "LOIN does not use these permissions for advertising or unrelated monitoring.",
      ],
    },
    {
      heading: "9. Acceptable Use",
      body: [
        "You agree not to:",
        "- Attempt to bypass or interfere with LOIN's security features.",
        "- Reverse engineer, copy, or exploit the application except as permitted by law.",
        "- Use LOIN for unlawful purposes.",
        "- Upload harmful, illegal, or abusive content.",
        "- Disrupt or interfere with the operation of the service.",
      ],
    },
    {
      heading: "10. Intellectual Property",
      body: [
        "LOIN, including its name, branding, logo, interface, graphics, illustrations, software, and original content, is owned by LOIN or its licensors and is protected by applicable intellectual property laws.",
        "You may not reproduce, distribute, modify, or create derivative works without prior written permission.",
      ],
    },
    {
      heading: "11. Account Suspension & Termination",
      body: [
        "We reserve the right to suspend or terminate accounts that:",
        "- Violate these Terms.",
        "- Abuse the service.",
        "- Attempt fraud.",
        "- Interfere with other users or the platform.",
        "Termination may result in loss of access to your account and associated data.",
      ],
    },
    {
      heading: "12. Availability",
      body: [
        "We strive to keep LOIN available at all times.",
        "However, we do not guarantee uninterrupted or error-free operation.",
        "The service may be temporarily unavailable due to:",
        "- Maintenance",
        "- Software updates",
        "- Technical failures",
        "- Third-party outages",
        "- Events beyond our reasonable control",
      ],
    },
    {
      heading: "13. Disclaimer",
      body: [
        'LOIN is provided on an "as is" and "as available" basis.',
        "To the fullest extent permitted by law, we disclaim warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      ],
    },
    {
      heading: "14. Limitation of Liability",
      body: [
        "To the maximum extent permitted by applicable law, LOIN and its owners shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the application.",
        "This includes, but is not limited to:",
        "- Lost productivity",
        "- Lost profits",
        "- Missed deadlines",
        "- Academic or professional consequences",
        "- Loss of data",
        "- Device issues beyond our reasonable control",
        "Your use of LOIN is at your own discretion and risk.",
      ],
    },
    {
      heading: "15. Changes to the Service",
      body: [
        "We may modify, improve, suspend, or discontinue features of LOIN at any time without prior notice.",
        "We may also update these Terms from time to time.",
        "Continued use of LOIN after changes become effective constitutes acceptance of the revised Terms.",
      ],
    },
    {
      heading: "16. Governing Law",
      body: [
        "These Terms shall be governed by and interpreted in accordance with the laws of India, without regard to conflict of law principles.",
        "Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.",
      ],
    },
    {
      heading: "17. Contact",
      body: [
        "If you have questions regarding these Terms, please contact:",
        "Email: barikimokshith@gmail.com",
      ],
    },
  ],
  outro: ["Thank you for using LOIN.", "Every session is a promise.", "Every promise is yours to keep."],
};
