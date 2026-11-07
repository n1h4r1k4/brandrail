// Golden set v1: labelled content for the fictional Nimbus Pay brand.
// `expected` lists the rule codes a correct reviewer should flag (one entry per rule, not per span).
// An empty list marks a clean control: any flag on it is a false positive.
// Labels marked "AI" in the note need judgement and are not expected from rule-based checks alone.
export interface GoldenItem {
  id: string;
  channel: string;
  audience?: string;
  body: string;
  expected: string[];
  note?: string;
}

export const GOLDEN: GoldenItem[] = [
  { id: "g01", channel: "Instagram", body: "This Diwali, switch to Nimbus pay, India's fastest UPI app with 100% secure payments. Get 5% cashback till 31 Oct! Act now or miss out forever!", expected: ["TRM-01", "CLM-04", "CLM-02", "LEG-02", "LEG-01", "TON-03", "TON-04"] },
  { id: "g02", channel: "Email", audience: "Existing users, beginners to saving", body: "Subject: Grow your savings with guaranteed returns\n\nHi there,\n\nNimbus Save now offers 7.5% p.a. on your savings, the best rate in India. Our eco-friendly paperless account is backed by RBI, so your money is completely safe. Start a SIP today and double your money.\n\nClick here to start saving.\n\nTeam NimbusPay", expected: ["CLM-03", "LEG-01", "CLM-04", "CLM-05", "LEG-04", "CLM-02", "LEG-03", "ACC-04", "TRM-01"] },
  { id: "g03", channel: "Blog", body: "Big news is coming! Our team has been quietly building Project Falcon, a brand-new Nimbus Credit Line that launches on 15 January. Unlike ZapPay, we will give instant credit to everyone, no questions asked. Write to priya.k@gmail.com or call 9876543210 for early access.", expected: ["CNF-01", "TRM-04", "TRM-03", "CNF-02", "CLM-03"], note: "CLM-03 (credit for everyone) is AI" },
  { id: "g04", channel: "Website", body: "Set up AutoPay on Nimbus Pay and never miss a bill date. You choose the amount and the date, and you can pause or cancel any time. Most UPI payments complete in about 2 seconds, and every payment is protected with bank-grade 256-bit encryption. Money, made calm.", expected: [] },
  { id: "g05", channel: "Display ad", body: "Nimbus Pay is now 3x faster than before. Pay bills in a flash.", expected: ["CLM-01"] },
  { id: "g06", channel: "Instagram", body: "Join 15 million happy users on Nimbus Pay.", expected: ["CLM-01"] },
  { id: "g07", channel: "Display ad", body: "Rated 4.8 on Google Play. Download Nimbus Pay today.", expected: ["CLM-01"] },
  { id: "g08", channel: "Email", body: "Nimbus Pay is RBI approved and completely safe for your savings.", expected: ["LEG-04", "CLM-02"] },
  { id: "g09", channel: "SMS", body: "Guaranteed returns of 12% on Nimbus Save. Invest today!", expected: ["CLM-03", "CLM-01", "LEG-03"] },
  { id: "g10", channel: "Instagram", body: "Our green payments help save the planet.", expected: ["CLM-05"] },
  { id: "g11", channel: "Display ad", body: "Pay with Nimbus Pay, the most trusted UPI app in India.", expected: ["CLM-04"] },
  { id: "g12", channel: "Website", body: "Nimbus Pay ranked #1 for customer satisfaction among UPI apps in the FinServe India Survey 2026.", expected: [] },
  { id: "g13", channel: "X / Twitter", body: "Nimbus Pay is the #1 UPI app. Switch today.", expected: ["CLM-04"] },
  { id: "g14", channel: "Instagram", body: "Save more with AutoPay. It's the cheap way to never miss a bill.", expected: ["TRM-03"] },
  { id: "g15", channel: "Push", body: "Set up Auto-pay in seconds and relax.", expected: ["TRM-02"] },
  { id: "g16", channel: "Blog", body: "Unlike QuickRupee, we never surprise you with hidden fees.", expected: ["TRM-04"] },
  { id: "g17", channel: "LinkedIn", body: "Big things ahead: Project Orion brings a whole new look to the app in 2027.", expected: ["CNF-01"] },
  { id: "g18", channel: "Website", body: "Questions? Call our team at 9812345678.", expected: ["CNF-02"] },
  { id: "g19", channel: "Website", body: "Questions? Write to support@nimbuspay.example and we will reply within a day.", expected: [] },
  { id: "g20", channel: "Instagram", body: "URGENT!!! LAST CHANCE EVER to grab cashback!", expected: ["TON-03", "TON-04", "LEG-02"] },
  { id: "g21", channel: "Instagram", body: "Money made calm with Nimbus Pay.", expected: ["MSG-02"] },
  { id: "g22", channel: "Instagram", body: "Pay, save and stay in control. Money, made calm.", expected: [] },
  { id: "g23", channel: "Instagram", body: "Get 3% cashback on UPI payments, up to ₹150. T&C apply.", expected: [] },
  { id: "g24", channel: "Instagram", body: "Get 3% cashback on UPI payments, up to ₹500. T&C apply.", expected: ["CLM-01"] },
  { id: "g25", channel: "Email", body: "Earn up to 7.25% p.a. on Nimbus Save through our partner, Meridian Small Finance Bank.", expected: [] },
  { id: "g26", channel: "SMS", body: "Earn 7.5% p.a. on Nimbus Save. Open your account in minutes.", expected: ["LEG-01"] },
  { id: "g27", channel: "Instagram", body: "Start a SIP in mutual funds with Nimbus Pay today.", expected: ["LEG-03"] },
  { id: "g28", channel: "Website", body: "Nimbus Pay helps you pay, save and stay in control of your money. Money, made calm.", expected: [] },
  { id: "g29", channel: "Email", body: "Your bills are piling up and late fees are coming for you. Fix it with AutoPay before it ruins your credit score.", expected: ["TON-01"], note: "AI" },
  { id: "g30", channel: "Instagram", audience: "Young salaried users", body: "Leverage our omnichannel liquidity solutions to synergise your household cash flows.", expected: ["TON-02"], note: "AI" },
  { id: "g31", channel: "Instagram", body: "Trade crypto and stocks instantly on Nimbus Pay and get rich quick.", expected: ["MSG-01"], note: "AI" },
  { id: "g32", channel: "Email", audience: "First-time savers", body: "Complete your KYC and start a SIP for 12 months to build your corpus.", expected: ["MSG-03", "LEG-03"], note: "MSG-03 is AI" },
  { id: "g33", channel: "Website", body: "Click here to set up AutoPay.", expected: ["ACC-04"] },
  { id: "g34", channel: "Email", body: "Your monthly statement is ready to view 📄✨", expected: ["TON-05"] },
  { id: "g35", channel: "Instagram", body: "Diwali vibes 🪔✨🎉 with Nimbus Pay", expected: ["TON-05"] },
  { id: "g36", channel: "Website", audience: "All users", body: "Notwithstanding the aforementioned considerations regarding the operational characteristics of contemporary unified payments infrastructure, Nimbus Pay facilitates instantaneous interbank settlement functionality, comprehensive transactional documentation, configurable authorisation preferences, and sophisticated categorisation methodologies for discerning consumers who appreciate meticulous financial administration across multiple institutional relationships.", expected: ["ACC-03", "TON-02"], note: "TON-02 is AI" },
  { id: "g37", channel: "Instagram", body: "Split bills with friends in a few taps. Nimbus Pay keeps track of who owes what, so you don't have to.", expected: [] },
  { id: "g38", channel: "Push", body: "Pay your electricity bill on time with AutoPay. You can pause it any time from the app.", expected: [] },
  { id: "g39", channel: "Website", body: "Nimbus Pay works in 9 Indian languages, so you can pay in the language you think in.", expected: [] },
  { id: "g40", channel: "Website", body: "Every payment is protected with bank-grade 256-bit encryption.", expected: [] },
  { id: "g41", channel: "Email", body: "Our paperless statements are eco-friendly.", expected: ["CLM-05"] },
  { id: "g42", channel: "Display ad", body: "Nimbus Card: 1% cashback on all spends and no annual fee in the first year. T&C apply.", expected: [] },
  { id: "g43", channel: "Display ad", body: "Nimbus Card: 2% cashback on all spends. T&C apply.", expected: ["CLM-01"] },
  { id: "g44", channel: "LinkedIn", body: "Coming soon: the Nimbus Credit Line, with limits up to ₹5 lakh.", expected: ["CNF-01", "CLM-01"] },
];
