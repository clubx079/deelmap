import Image from 'next/image'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="relative bg-[#0F172A] text-white overflow-hidden">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'url(/assets/building.png)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Footer Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 text-left">
          
          {/* Logo Section */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Image
                src="/assets/logo.webp"
                alt="Deelmap"
                width={140}
                height={45}
                className="h-10 lg:h-12 w-auto"
                priority
              />
            </div>
          </div>

          {/* Explore Section */}
          <div className="lg:col-span-1">
            <h3 className="text-base font-bold mb-4 tracking-wider uppercase">
              EXPLORE
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/marketplace"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  MarketPlace
                </Link>
              </li>
              <li>
                <Link
                  href="/resources"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Resources
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-use"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="lg:col-span-1">
            <h3 className="text-base font-bold mb-4 tracking-wider uppercase">
              CONTACT
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <a 
                  href="tel:(888)780-8093" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  (888) 780-8093
                </a>
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <a 
                  href="mailto:Office@Deelmap.Co" 
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Office@Deelmap.Co
                </a>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 mr-3 mt-0.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-300">
                  Lexington, KY United States
                </span>
              </li>
            </ul>
          </div>

          {/* Buyer's List Section */}
          <div className="lg:col-span-1">
            <h3 className="text-base font-bold mb-4 tracking-wider uppercase">
              BUYER'S LIST
            </h3>
            <div className="mb-4">
              <a
                href="https://forms.monday.com/forms/160d7a7c32a951f6ab92b8812e440dc3?r=use1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm uppercase tracking-wide"
              >
                JOIN OUR BUYER'S LIST
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-gray-600">
          <div className="flex flex-col md:flex-row justify-between items-center">
            
            {/* Copyright */}
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © All Copyright 2025 By Deelmap.co
            </div>

            {/* Social Media */}
            <div className="flex items-center space-x-4">
              <a
                href="https://www.facebook.com/profile.php?id=61558574881051"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0EA5E9] hover:text-[#0284C7] transition-colors duration-200"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>

          </div>
        </div>
      </div>
    </footer>
  )
}