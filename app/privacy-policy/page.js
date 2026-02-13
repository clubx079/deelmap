'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      <Navbar currentPage="privacy-policy" />

      {/* Privacy Policy Content Section */}
      <section 
        className="relative py-16 lg:py-20 overflow-hidden"
        style={{ backgroundColor: '#F6F4F1' }}
      >
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/assets/aboutussection.jpg)',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: 0.15
          }}
        />
        
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-12">
            
            {/* Revised Date */}
            <p className="text-sm text-gray-600 mb-8">
              <strong>Revised:</strong> March 6, 2024
            </p>

            {/* Introduction */}
            <div className="prose prose-gray max-w-none mb-8">
              <p className="text-base leading-relaxed text-gray-700">
                Your information privacy is important to us. We provide this Privacy Policy to explain how we collect, use, protect, and disclose information and data when you use the website on which this policy is posted ("Site") and related services offered through the Site ("Services"). This Privacy Policy applies to all users of the Site and Services.
              </p>
              <p className="text-base leading-relaxed text-gray-700">
                This Privacy Policy is specific to this Site—it does not apply to any of our other websites or other online or offline services provided by us.
              </p>
              <p className="text-base leading-relaxed text-gray-700 font-semibold">
                BY USING THE SITE OR SERVICES, YOU ARE CONSENTING TO THIS PRIVACY POLICY. PLEASE READ IT CAREFULLY.
              </p>
            </div>

            {/* Section 1 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">1. Personal Information We Collect</h2>
              <p className="text-base leading-relaxed text-gray-700 mb-4">
                We may collect the following categories and types of "Personal Information":
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Contact Information:</strong> your first and last name, mailing address, email address, and phone number;</li>
                <li><strong>Other identifying information:</strong> IP address, social media usernames, passwords and other security information for authentication and access;</li>
                <li><strong>Financial Information:</strong> credit card, debit card and bank account information;</li>
                <li><strong>Demographic information:</strong> gender, age, employment information and salary information;</li>
                <li><strong>Geolocation data;</strong></li>
                <li><strong>Internet or other electronic activity:</strong> your browsing, search, and click history, including information about how you navigate within our Site and Services and which elements of our Site and Services you use the most;</li>
                <li><strong>Commercial information:</strong> products or services purchased or viewed on our Site;</li>
                <li><strong>Audio and visual information:</strong> your videos and photos; and</li>
                <li><strong>Inferences</strong> drawn from the categories described above in order to create a profile about you to reflect your preferences, characteristics, behavior and attitude.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">2. How We Use Personal Information</h2>
              <p className="text-base leading-relaxed text-gray-700 mb-4">
                We may use your Personal Information for the following categories of use:
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Transactional Purposes:</h3>
                  <p className="text-gray-700 mb-2">We may use your contact information, financial information, and commercial information to:</p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Receive, process, confirm, send and track your order, subscription or registration;</li>
                    <li>Communicate with you about your order, subscription or registration; and</li>
                    <li>Process any subscription or registration you make to one of our Services.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytical Purposes:</h3>
                  <p className="text-gray-700">We may use your other identifying information, internet activity and browsing history, commercial information, demographic information, and geolocation data to analyze preferences, trends and statistics.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Marketing and Promotional Purposes:</h3>
                  <p className="text-gray-700 mb-2">We may use your contact information, commercial information, demographic information, internet or other electronic activity, geolocation data and inferences to:</p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Inform you of our new products, services and offers;</li>
                    <li>Provide you with targeted advertising;</li>
                    <li>Run contests, promotions and sweepstakes;</li>
                    <li>Provide you with our loyalty program including earning points and awarding and redeeming certificates; and</li>
                    <li>Provide you with other information from and about us, including personalized marketing communications.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Maintenance and Improvement of the Site and Services:</h3>
                  <p className="text-gray-700 mb-2">We may use your contact information, commercial information, and internet activity and browsing history to:</p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700">
                    <li>Provide you with the Site and Services, including to send you alerts about your account;</li>
                    <li>Handle your customer services requests; and</li>
                    <li>Help us diagnose technical and service problems and administer our stores, the Site, and the Services.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Review and content creation purposes:</h3>
                  <p className="text-gray-700">We may use your contact information, commercial information, and audio and visual information to enable reviews of our products and to display content that you have created and allowed us to display on our Site and Services and on social media.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Security and Fraud Prevention:</h3>
                  <p className="text-gray-700">We may use your contact information, other identifying information, commercial information, internet activity and browsing history, and inferences to protect the Site and services, our company, and others and to prevent fraud, theft and misconduct.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Legal and Other Requirements:</h3>
                  <p className="text-gray-700">We may use your personal information to comply with legal requirements or when necessary to provide to our lawyers, accountants or other advisors. We may also use your personal information for other purposes for which you have consented to. This may include for a secondary purpose that is related to a purpose for which we collected it, and for which you would reasonably expect us to use your information for.</p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">3. Sources of Personal Information</h2>
              <p className="text-base leading-relaxed text-gray-700 mb-4">
                We may collect Personal Information from the following sources:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>We collect information directly from you.</strong> We may collect contact, demographic and financial information directly from you including when you fill out a form on our Site, sign up for communications from us, or ask us to contact you. The information that we collect depends on the nature of your interactions with us.</li>
                <li><strong>We collect information from our Service Providers.</strong> We collect information from our Service Providers (defined below) that collect certain Personal Information from or about you on our behalf, such as an analytics software or platform that we use to measure and analyze traffic to the Site, the Services or interaction with our ads.</li>
                <li><strong>We collect information from other third-party sources.</strong> We may also collect information about you from third-party sources, including any information you make publicly available on social media platforms or other online or offline resources, or when you give us consent to link your account to a third-party service or provider.</li>
                <li><strong>We collect information from you passively.</strong> We may collect internet or other electronic activity passively using tools like browser cookies. This activity is further described in the Cookies and Advertising and Online Tracking sections below.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">4. Categories of Third Parties We Share Personal Information With</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-gray-800 font-semibold">Third-Party Privacy</p>
                <p className="text-gray-700">We will never share, trade, or otherwise sell your personal information such as phone numbers and SMS consent with third parties under any circumstances.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Affiliates</h3>
                  <p className="text-gray-700">We may share Personal Information with businesses controlling, controlled by, or under common control with us, where such affiliates or subsidiaries are acting as our Service Provider, or where required by law.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Corporate Transactions</h3>
                  <p className="text-gray-700">If we merge, are acquired, or are sold, or in the event of a transfer of some or all of our assets, we may disclose or transfer Personal Information in connection with such transaction.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance with Laws and Law Enforcement</h3>
                  <p className="text-gray-700">We cooperate with government and law enforcement officials and private parties to enforce and comply with the law. We may disclose Personal Information and any other information about you to government or law enforcement officials or private parties if, in our discretion, we believe it is necessary or appropriate in order to respond to legal requests (including court orders and subpoenas), to protect the safety, property, or rights of our company or of any third party, to prevent or stop any illegal, unethical, or legally actionable activity, or to comply with the law.</p>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">5. Privacy Notice Specific to Mobile Messaging</h2>
              <p className="text-base leading-relaxed text-gray-700">
                We will only use information you provide when opting into mobile messaging (the "Program") to transmit your mobile messages and respond to you, if necessary. WE DO NOT SELL, RENT, LOAN, TRADE, LEASE OR OTHERWISE TRANSFER ANY PHONE NUMBERS OR CUSTOMER INFORMATION COLLECTED THROUGH THE PROGRAM TO ANY THIRD PARTY FOR SUCH THIRD PARTY'S MARKETING PURPOSES OR OTHERWISE FOR SUCH THIRD PARTY'S OWN BENEFIT. Nonetheless, we reserve the right at all times to disclose any information as necessary to satisfy any law, regulation or governmental request, to avoid liability, or to protect our rights or property. This Section is strictly limited to the Program and has no effect on other provisions of this Privacy Policy that may govern the relationship between you and us in other contexts. To view our complete Mobile Messaging Terms and Conditions, please see the Terms of Use on our Site.
              </p>
            </div>

            {/* Sections 6-18 */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">6. Cookies</h2>
              <p className="text-base leading-relaxed text-gray-700">
                We may use cookies (a small text file placed on your computer to identify your computer and web browser) and may use anonymous identifiers (a random string of characters that is used for the same purposes as a cookie). We may use cookies and other similar technologies to analyze use of and improve the Site and Services and as described in the Advertising and Online Tracking Section of this Privacy Policy. Most web browsers are initially set up to accept cookies. You can reset your web browser to refuse all cookies or to indicate when a cookie is being sent, however, certain features of the Site or Services may not work if you delete or disable cookies. Some of our Service Providers may use their own cookies, anonymous identifiers, or other tracking technology in connection with the services they perform on our behalf.
              </p>
              <p className="text-base leading-relaxed text-gray-700 mt-4">
                We may use Google Analytics on the Site and Services to analyze how users use the Site and Services, and to provide advertisements to you on other websites. For more information about how to opt out of having your information used by Google Analytics, visit <a href="https://tools.google.com/dlpage/gaoptout/" className="text-[#b29578] hover:underline" target="_blank" rel="noopener noreferrer">https://tools.google.com/dlpage/gaoptout/</a>.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">7. Session Replay Technology</h2>
              <p className="text-base leading-relaxed text-gray-700">
                We use session replay technology on our Site. Session replay technology, also referred to as session playback or user experience (UX) replay, collects information regarding records and tracks your interactions with a website or application. It then transforms those logged user events (such as mouse movements, clicks, page visits, scrolling, tapping, etc.) into a reproduction of what you actually did on the website or application. We use session replays for quality control, customer service, fraud prevention and security, and marketing purposes. Our session replay technology is owned and operated by a third-party who acts as our service provider. The information collected by this technology may be collected by, transferred to, and stored by our third-party service provider.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">8. ChatBot Technology</h2>
              <p className="text-base leading-relaxed text-gray-700">
                We use chatbots to help provide customer service and support, including through the use of a virtual assistant. A chatbot is a software application that mimics human conversations in text or voice interactions on our website or through our customer service hotline. When asked a question, the chatbot will answer using the knowledge database that is currently available to it. If the conversation introduces a concept it isn't programmed to understand, it will pass it to a human operator. If you use our chatbot service, we will collect any information you provide to us. We will also create and store a transcript of your chat interaction with us which will be shared with and stored by our third-party service provider. We use these transcripts and the information you provide for quality control, customer service, fraud prevention and security.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">9. Advertising and Online Tracking</h2>
              <p className="text-base leading-relaxed text-gray-700">
                We may place advertisements and allow third-party companies to serve ads and collect certain information when you visit the Site. These companies may use certain information during your visits to this Site and other websites in order to provide advertisements about goods and services likely to be of interest to you. These companies typically collect such information using server logs, cookies, web beacons, tags, pixels, mobile advertising IDs, cross-device linking, and similar technologies. Our systems do not recognize browser "Do Not Track" signals, but several of our Service Providers who utilize these cookies on this Site enable you to opt out of targeted advertising practices. To learn more about these advertising practices or to opt out of this type of advertising, you can visit <a href="http://www.networkadvertising.org" className="text-[#b29578] hover:underline" target="_blank" rel="noopener noreferrer">www.networkadvertising.org</a> or <a href="http://www.aboutads.info/choices/" className="text-[#b29578] hover:underline" target="_blank" rel="noopener noreferrer">www.aboutads.info/choices/</a>. Options you make are device specific.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">10. Managing Your Information Preferences</h2>
              <p className="text-base leading-relaxed text-gray-700">
                You can opt out of receiving marketing e-mails from us by following the link provided at the bottom of all marketing e-mails you receive from us. You are able to opt out of receiving marketing e-mails from us, however, you cannot opt out of receiving all e-mails from us, such as e-mails about the status of your account.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">11. Be Careful When You Share Information with Others</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Please be aware that whenever you share information on any public area of the Site or Services, that information may be accessed by others. In addition, please remember that when you share information in any other communications with third parties, that information may be passed along or made public by others. This means that anyone with access to such information can potentially use it for any purpose, including sending unsolicited communications. We cannot control and are not responsible for what such third parties may do with your information, so you should exercise caution when choosing to share it.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">12. Security</h2>
              <p className="text-base leading-relaxed text-gray-700">
                We maintain physical, electronic, and procedural safeguards to help protect the confidentiality and security of information transmitted to us. Personal information may be accessed by persons within our organization, or other entities described in this Privacy Policy, or our third-party service providers, who require such access to carry out the purposes described in this Privacy Policy, or as otherwise permitted or required by applicable law.
              </p>
              <p className="text-base leading-relaxed text-gray-700 mt-4">
                However, no data transmission over the Internet or other network can be guaranteed to be 100% secure, and no security measures can provide absolute protection. As a result, while we strive to protect information transmitted on or through the Site or Services, we cannot and do not guarantee the security of any information you transmit on or through the Site or Services, or that you otherwise provide to us, and you do so at your own risk.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">13. Links</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Our Site and Services may contain links to other websites or allow others to send you such links. A link to a third party's website does not mean that we endorse it or that we are affiliated with it. We do not exercise control over third-party websites and are not responsible for their practices. You access such third-party websites or content at your own risk. You should always read the privacy policy of a third-party website before providing any information to the website.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">14. Children's Privacy</h2>
              <p className="text-base leading-relaxed text-gray-700">
                The Site and Services are intended for users who are 18 years old or older. We do not knowingly collect Personal Information from children under the age of 13. If we become aware that we have inadvertently received Personal Information from a child under the age of 13, we will delete such information from our records.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">15. Processing in the United States</h2>
              <p className="text-base leading-relaxed text-gray-700">
                Please be aware that your Personal Information and communications may be transferred to and maintained on servers or databases located outside your state, province, or country. If you are located outside of the United States, please be advised that we process and store all information in the United States. The laws in the United States may not be as protective of your privacy as those in your location. Personal information processed and stored in another country may be subject to disclosure or access requests by the governments, courts or law enforcement or regulatory agencies in that country according to its laws. By using the Site or Services, you are agreeing to the collection, use, transfer, and disclosure of your Personal Information and communications will be governed by the applicable laws in the United States. If you have any questions regarding international data transfers, you may contact us using the contact information we provide below.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">16. Notice to Residents of Canada</h2>
              <p className="text-base leading-relaxed text-gray-700 mb-4">
                If you are a resident of Canada, you may have certain privacy rights under Canadian privacy law.
              </p>
              <p className="text-base leading-relaxed text-gray-700">
                You have a right to request access to your personal information and to request a correction to it if you believe it is inaccurate. If you would like to have access to the personal information we have about you, or if you would like to have it corrected, please contact us using the contact information provided on the Site. Please note that in some cases, we may not be able to allow you to access certain personal information in certain circumstances, for example if it contains personal information of other persons, or for legal reasons.
              </p>
              <p className="text-base leading-relaxed text-gray-700 mt-4">
                To help protect against fraudulent requests for access to your personal information, we may ask you for information to allow us to confirm that the person making the request is you or is authorized to access your information before granting access.
              </p>
              <p className="text-base leading-relaxed text-gray-700 mt-4">
                Subject to limitations under the law, you may also withdraw your consent to our processing of your personal information. Please note that this does not affect the lawfulness of processing based on consent before it is withdrawal. Please note that if you seek to withdraw consent to processing of personal data that is necessary for us to provide you with goods or services, we may no longer be able to provide such goods or services to you.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">17. Privacy Policy Changes</h2>
              <p className="text-base leading-relaxed text-gray-700">
                We may change this Privacy Policy from time to time. If we decide to change this Privacy Policy, we will inform you by posting the revised Privacy Policy on the Site. Those changes will go into effect on the "Revised" date shown in the revised Privacy Policy. By continuing to use the Site or Services, you are consenting to the revised Privacy Policy.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#022b41] mb-4">18. Contact Us</h2>
              <p className="text-base leading-relaxed text-gray-700">
                If you have any questions or concerns, or would like to submit a complaint to us, you may contact us at the contact information available on the Site.
              </p>
              <p className="text-base leading-relaxed text-gray-700 mt-4">
                Please print a copy of this privacy policy for your records and please check the Site frequently for any changes.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Don't Hesitate CTA Section */}
      <section 
        className="relative py-16 lg:py-20 overflow-hidden"
        style={{ backgroundColor: '#B29578' }}
      >
        {/* Background Overlay Image */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/assets/overlaycta.png)',
            backgroundPosition: 'center left',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            opacity: 0.5
          }}
        />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            
            {/* Left side - Text Content */}
            <div className="text-center lg:text-left lg:flex-1">
              <p 
                className="text-sm sm:text-base font-medium text-white uppercase tracking-wider mb-4"
                style={{ 
                  animation: 'fadeInUp 1.2s ease-out',
                  opacity: 0.9
                }}
              >
                DON'T HESITATE TO CONTACT US
              </p>
              <h2 
                className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight"
                style={{ 
                  animation: 'fadeInUp 1.2s ease-out 0.2s both'
                }}
              >
                MAKE AN APPOINTMENT NOW
              </h2>
            </div>
            
            {/* Right side - CTA Button */}
            <div 
              className="lg:flex-shrink-0"
              style={{ 
                animation: 'fadeInUp 1.2s ease-out 0.4s both'
              }}
            >
              <a
                href="/contact"
                className="inline-block bg-[#022b41] hover:bg-white hover:text-[#022b41] text-white px-8 lg:px-12 py-4 lg:py-5 rounded-lg font-bold text-sm lg:text-base uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                CONTACT US TODAY!
              </a>
            </div>
            
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}