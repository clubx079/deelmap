'use client'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Image from 'next/image'

export default function LeadershipPage() {
  const leaders = [
    {
      name: "John Anderson",
      role: "Chief Executive Officer",
      description: "John brings over 15 years of experience in real estate technology and investment. He has been instrumental in building Deelmap into the leading wholesale marketplace, connecting thousands of investors with quality deals nationwide."
    },
    {
      name: "Sarah Mitchell",
      role: "Chief Operating Officer",
      description: "Sarah oversees all operational aspects of Deelmap, ensuring seamless transactions and exceptional user experience. With a background in real estate finance, she has helped scale the platform to serve investors across 45 states."
    }
  ]

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal text-[#1A1816] mb-8 leading-tight tracking-tight">
              Leadership
            </h1>
            <p className="text-xl sm:text-2xl text-[#737370] leading-relaxed max-w-3xl mx-auto">
              Meet the experienced team driving Deelmap's mission to revolutionize wholesale real estate investing.
            </p>
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
            {leaders.map((leader, index) => (
              <div key={index} className="text-center">
                {/* Leader Image */}
                <div className="relative w-64 h-64 mx-auto mb-6 rounded-full overflow-hidden bg-[#E8E8E4]">
                  <Image
                    src={`https://i.pravatar.cc/300?img=${index + 1}`}
                    alt={leader.name}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Leader Info */}
                <h3 className="text-2xl lg:text-3xl font-normal text-[#1A1816] mb-2">
                  {leader.name}
                </h3>
                <p className="text-lg text-[#737370] mb-6 font-medium">
                  {leader.role}
                </p>
                <p className="text-base text-[#444441] leading-relaxed max-w-md mx-auto">
                  {leader.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center">
            <h2 className="text-3xl lg:text-4xl font-normal text-[#1A1816] mb-6">
              About Our Company
            </h2>
            <div className="space-y-6 text-lg text-[#444441] leading-relaxed">
              <p>
                Deelmap is led by a team of seasoned real estate professionals and technology experts who are passionate about transforming the wholesale real estate industry. Our leadership team combines decades of experience in real estate investment, technology development, and marketplace operations.
              </p>
              <p>
                Under their guidance, Deelmap has grown from a vision to connect investors with quality deals into a thriving marketplace that facilitates millions of dollars in transactions annually. Our leaders are committed to maintaining the highest standards of trust, transparency, and service excellence.
              </p>
              <p>
                Together, we're building the future of wholesale real estate investing, making it easier for investors to find, evaluate, and close deals while providing wholesalers with access to a network of serious, qualified buyers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
