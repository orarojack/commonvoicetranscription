"use client"

import React, { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, FileText, Shield, AlertCircle } from "lucide-react"

interface ConsentLicenseFormProps {
  onConsentChange: (consented: boolean) => void
  onLicenseChange: (accepted: boolean) => void
}

export default function ConsentLicenseForm({ onConsentChange, onLicenseChange }: ConsentLicenseFormProps) {
  const [hasReadConsent, setHasReadConsent] = useState(false)
  const [hasReadLicense, setHasReadLicense] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [licenseAccepted, setLicenseAccepted] = useState(false)
  const [consentScrollProgress, setConsentScrollProgress] = useState(0)
  const [licenseScrollProgress, setLicenseScrollProgress] = useState(0)
  
  const consentScrollRef = useRef<HTMLDivElement>(null)
  const licenseScrollRef = useRef<HTMLDivElement>(null)

  // Check if user has scrolled to bottom of consent
  const handleConsentScroll = () => {
    const scrollElement = consentScrollRef.current
    if (!scrollElement) return

    const scrollTop = scrollElement.scrollTop
    const scrollHeight = scrollElement.scrollHeight
    const clientHeight = scrollElement.clientHeight
    
    // Handle case where content fits without scrolling (division by zero)
    const scrollableHeight = scrollHeight - clientHeight
    const scrollPercentage = scrollableHeight > 0 
      ? (scrollTop / scrollableHeight) * 100 
      : 100 // If no scroll needed, consider it 100% read
    setConsentScrollProgress(Math.min(100, Math.max(0, scrollPercentage)))

    // Consider "read" if scrolled to 95% or more
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasReadConsent(true)
    }
  }

  // Check if user has scrolled to bottom of license
  const handleLicenseScroll = () => {
    const scrollElement = licenseScrollRef.current
    if (!scrollElement) return

    const scrollTop = scrollElement.scrollTop
    const scrollHeight = scrollElement.scrollHeight
    const clientHeight = scrollElement.clientHeight
    
    // Handle case where content fits without scrolling (division by zero)
    const scrollableHeight = scrollHeight - clientHeight
    const scrollPercentage = scrollableHeight > 0 
      ? (scrollTop / scrollableHeight) * 100 
      : 100 // If no scroll needed, consider it 100% read
    setLicenseScrollProgress(Math.min(100, Math.max(0, scrollPercentage)))

    // Consider "read" if scrolled to 95% or more
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasReadLicense(true)
    }
  }

  // Update parent component when consent changes
  useEffect(() => {
    onConsentChange(consentAccepted)
  }, [consentAccepted, onConsentChange])

  // Update parent component when license changes
  useEffect(() => {
    onLicenseChange(licenseAccepted)
  }, [licenseAccepted, onLicenseChange])

  // Handle consent checkbox change
  const handleConsentCheck = (checked: boolean) => {
    if (hasReadConsent) {
      setConsentAccepted(checked)
    }
  }

  // Handle license checkbox change
  const handleLicenseCheck = (checked: boolean) => {
    if (hasReadLicense) {
      setLicenseAccepted(checked)
    }
  }

  return (
    <div className="space-y-6">
      {/* Study Consent Section */}
      <Card className="border-2 border-blue-200 bg-blue-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Study Information and Consent Form</CardTitle>
                <p className="text-sm text-gray-600 font-normal mt-1">
                  Please read the entire consent form before proceeding
                </p>
              </div>
            </div>
            {hasReadConsent && (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scroll Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Reading Progress</span>
              <span>{Math.round(consentScrollProgress || 0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${consentScrollProgress || 0}%` }}
              />
            </div>
          </div>

          {/* Scrollable Consent Content */}
          <div className="relative">
            <ScrollArea 
              className="h-[300px] rounded-lg border-2 border-gray-200 bg-white p-6"
              onScrollCapture={handleConsentScroll}
            >
              <div ref={consentScrollRef} className="space-y-4 text-sm text-gray-700 leading-relaxed pr-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-base text-gray-900">PROJECT NAME: DHOLUO SPEECH DATASET UNDER MOZILLA COMMON VOICE</h3>
                  <p className="text-sm text-gray-600">Project Email: kencorpus@maseno.ac.ke</p>
                </div>

                <p>
                  You are being invited to participate in collecting data under the Mozilla Common Voice project. The purpose of the project is to support the establishment of a corpus of text and voice data for dholuo language spoken in Kenya.
                </p>

                <p>You are eligible to participate in this study if you are over 18 years of age and a citizen of Kenya.</p>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-800">The research procedures involve one or more of the following activities:</p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Short voice recording - reading a sentence and recording one's voice</li>
                    <li>Reviewing recordings - listening to what others have recorded and reviewing the quality of the recordings</li>
                  </ul>
                </div>

                <p>
                  Participation in this study is voluntary. You may choose to skip a sentence or a study procedure. You may refuse to participate or discontinue your involvement at any time without penalty. You are free to withdraw from this study at any time.
                </p>

                <p>
                  If you decide to withdraw from this study, please notify the research team immediately via the email address shown at the top. Your data will be removed from our database and unavailable for future download and use. However, previous download and use will not be impacted.
                </p>

                <p>
                  Possible risks/discomforts associated with the study are possible, such as, emotional discomfort in responding to questions concerning personal experiences. However, care shall be taken not to breach confidentiality. The study will not disclose your identity to parties outside of the study team without your permission, and your name and personal details will not be stored with the data.
                </p>

                <p>
                  All research data collected will be stored securely and confidentially in a password secured and encrypted platform.
                </p>

                <p>
                  If you have any comments, concerns, or questions regarding the conduct of this research please contact the researcher listed at the top.
                </p>

                <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="font-semibold text-gray-800">By accepting below, I consent to participate in the data collection exercise described above towards the development of the Kenyan languages corpus.</p>
                  <ul className="list-disc pl-6 space-y-2 text-sm">
                    <li>
                      I understand the procedures to be used in this project. I understand that my voice will be recorded, and that my recorded voice will be included in a data corpus that may be made publicly available to other researchers. I understand that it may be possible for others to identify me by my voice, and I understand that no personal information will be connected to my voice apart from my age, my gender and how well I am trained in speaking or singing.
                    </li>
                    <li>
                      I may obtain copies of the results of this study, upon its completion, by contacting the researchers. I have been informed that the results of this research may be published, and that my identity will be kept confidential.
                    </li>
                  </ul>
                </div>

                <div className="h-px bg-gray-300 my-4"></div>
                <p className="text-center text-sm text-gray-500 italic">End of Consent Form</p>
              </div>
            </ScrollArea>
            
            {/* Scroll indicator */}
            {!hasReadConsent && consentScrollProgress < 95 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent h-16 flex items-end justify-center pb-3 pointer-events-none">
                <p className="text-xs text-gray-500 font-medium animate-pulse">
                  ↓ Scroll down to read the entire document ↓
                </p>
              </div>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className={`bg-white rounded-lg p-4 border-2 transition-all ${
            hasReadConsent ? 'border-green-200 bg-green-50' : 'border-gray-200'
          }`}>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="consent"
                checked={consentAccepted}
                onCheckedChange={handleConsentCheck}
                disabled={!hasReadConsent}
                className="mt-1"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="consent" 
                  className={`text-sm font-medium cursor-pointer ${
                    hasReadConsent ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  I have read and consent to participate in the Dholuo Speech Dataset study *
                </Label>
                {!hasReadConsent && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Please scroll through the entire consent form to enable this option</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Agreement Section */}
      <Card className="border-2 border-purple-200 bg-purple-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Data License Agreement</CardTitle>
                <p className="text-sm text-gray-600 font-normal mt-1">
                  Please read the entire license agreement before proceeding
                </p>
              </div>
            </div>
            {hasReadLicense && (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scroll Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Reading Progress</span>
              <span>{Math.round(licenseScrollProgress || 0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${licenseScrollProgress || 0}%` }}
              />
            </div>
          </div>

          {/* Scrollable License Content */}
          <div className="relative">
            <ScrollArea 
              className="h-[300px] rounded-lg border-2 border-gray-200 bg-white p-6"
              onScrollCapture={handleLicenseScroll}
            >
              <div ref={licenseScrollRef} className="space-y-4 text-sm text-gray-700 leading-relaxed pr-4">
                <h3 className="font-bold text-base text-gray-900">Dholuo Speech Dataset License</h3>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">Creation:</h4>
                  <p>
                    The Dholuo speech dataset was created by researchers from Maseno Centre for Applied Artificial Intelligence, Maseno University and members from the Dholuo language community from Kenya. All collaborators and contributors will be listed and acknowledged once the dataset is released.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">Licensing:</h4>
                  <p>
                    Licensing African datasets is vital to ensure that data creation, sharing, and use uphold the rights and interests of local communities. Well-defined licenses promote transparency and fairness by specifying how data can be accessed, reused, or commercialized, while safeguarding cultural knowledge, linguistic heritage, and collective ownership. They also help prevent exploitation by external actors and ensure that the benefits, such as research advancements, technological innovation, and economic value, are equitably shared. By adopting clear and culturally grounded data licenses, African researchers and institutions can reinforce data sovereignty, build trust, and promote the ethical and sustainable growth of the continent's AI and digital ecosystems.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">Open License:</h4>
                  <p>
                    The Dholuo Community from Kenya was consulted during the creation of this dataset and selection of the license for use. For this data collection effort, the Dholuo Speech dataset is licensed under the Nwulite Obodo Data License. View the license at this link:{" "}
                    <a href="https://licensingafricandatasets.com/nwulite-obodo-license" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      https://licensingafricandatasets.com/nwulite-obodo-license
                    </a>
                  </p>
                </div>

                <div className="space-y-3 bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-gray-800">Honoring the Dholuo Heritage Through Responsible Data Use</h4>
                  <p>
                    When you use this dataset, you become part of a meaningful partnership with the Dholuo community members who contributed to creating this valuable resource. We ask that you acknowledge these dedicated contributors in your work, helping to celebrate and strengthen their rich cultural identity while ensuring that any applications of this data honor and preserve the Dholuo language and traditions for future generations.
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">Terms of Licensing:</h4>
                  
                  <p>
                    Users from developing countries are invited to join this collaborative spirit by sharing any materials they create using this dataset under a license that aligns with the Nwulite Obodo Open Data License, fostering knowledge exchange across similar communities.
                  </p>

                  <p className="font-medium">
                    For users from developed countries, we envision an even deeper partnership that brings tangible benefits back to the Dholuo community contributors:
                  </p>

                  <div className="space-y-3 ml-4">
                    <div>
                      <p className="font-semibold text-gray-800">Language Vitality & Learning:</p>
                      <p>
                        Help keep the Dholuo language alive and thriving by supporting the creation of digital learning tools, mobile apps, and online resources that make it easier for both community contributors and others to learn, practice, and use the language in daily life. Examples include developing interactive language learning apps, creating digital storytelling platforms for elders to share traditional tales, or building voice recognition systems that work with Dholuo pronunciation.
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-800">Technology & Translation Tools:</p>
                      <p>
                        Share cutting-edge translation software, AI applications, and language processing tools that break down communication barriers and help Dholuo speakers participate more fully in our interconnected digital world. This could involve creating Dholuo-to-English translation services for government documents, developing voice assistants that understand Dholuo commands, or building text-to-speech systems for accessibility applications.
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-800">Economic Empowerment:</p>
                      <p>
                        Champion community-led projects that create real jobs and business opportunities for the Dholuo contributors and their broader community, helping to build sustainable economic growth. Examples include funding local language documentation projects that employ community historians, supporting digital marketplace platforms where artisans can sell traditional crafts with Dholuo descriptions, or establishing language teaching cooperatives.
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-800">Educational Access & Growth:</p>
                      <p>
                        Open doors to learning by providing educational materials, digital resources, and scholarship opportunities that enhance literacy and create pathways for community contributors and their families to pursue higher education and professional development. This might include creating digital libraries of Dholuo literature, funding university scholarships for linguistics students from the contributing community, or developing culturally relevant STEM educational content in the Dholuo language.
                      </p>
                    </div>
                  </div>

                  <p>
                    These partnerships ensure that technological advancement serves not just innovation, but also gives back to the very people who made this dataset possible through their generous contributions.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Contact:</h4>
                  <p>
                    The following contact information can be used to coordinate fulfillment of the terms of the licence: email{" "}
                    <a href="mailto:kencorpus@maseno.ac.ke" className="text-blue-600 hover:underline">
                      kencorpus@maseno.ac.ke
                    </a>
                  </p>
                </div>

                <div className="h-px bg-gray-300 my-4"></div>
                <p className="text-center text-sm text-gray-500 italic">End of License Agreement</p>
              </div>
            </ScrollArea>

            {/* Scroll indicator */}
            {!hasReadLicense && licenseScrollProgress < 95 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent h-16 flex items-end justify-center pb-3 pointer-events-none">
                <p className="text-xs text-gray-500 font-medium animate-pulse">
                  ↓ Scroll down to read the entire document ↓
                </p>
              </div>
            )}
          </div>

          {/* License Checkbox */}
          <div className={`bg-white rounded-lg p-4 border-2 transition-all ${
            hasReadLicense ? 'border-green-200 bg-green-50' : 'border-gray-200'
          }`}>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="license"
                checked={licenseAccepted}
                onCheckedChange={handleLicenseCheck}
                disabled={!hasReadLicense}
                className="mt-1"
              />
              <div className="flex-1">
                <Label 
                  htmlFor="license" 
                  className={`text-sm font-medium cursor-pointer ${
                    hasReadLicense ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  I have read and agree to the licensing terms of the Dholuo Speech Dataset *
                </Label>
                {!hasReadLicense && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Please scroll through the entire license agreement to enable this option</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Alert */}
      {consentAccepted && licenseAccepted && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Thank you for reviewing and accepting both the consent form and license agreement. You may now proceed with completing your profile.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

