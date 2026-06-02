const jobCategoryContent = {
  'government-jobs': {
    intro:
      'Government job listings include public-sector openings, exam notifications, and application deadlines that need careful date and document checks.',
    faqs: [
      {
        question: 'How are government job listings reviewed?',
        answer: 'Listings are checked for organization, deadline, role details, and source consistency before publication where source data is available.',
      },
      {
        question: 'What should I verify before applying?',
        answer: 'Always verify the official notification, eligibility, application fee, deadline, and official application link before submitting.',
      },
      {
        question: 'Which QuickUtils tools help with applications?',
        answer: 'Photo resize, signature resize, PDF compression, and image-to-PDF workflows are commonly useful for government applications.',
      },
    ],
  },
  internships: {
    intro:
      'Internship listings focus on early-career opportunities where role fit, duration, skills, stipend, and application process matter most.',
  },
  'fresher-jobs': {
    intro:
      'Fresher job listings are organized for candidates comparing entry-level roles, eligibility, skills, location, and application deadlines.',
  },
  'remote-jobs': {
    intro:
      'Remote job listings highlight opportunities where location flexibility, work mode, required skills, and application instructions should be checked closely.',
  },
  'it-jobs': {
    intro:
      'IT job listings group software, development, support, data, and technology roles so candidates can compare requirements and application links quickly.',
  },
}

const fallbackFaq = (name) => [
  {
    question: `What types of listings appear in ${name}?`,
    answer: `${name} includes published job listings grouped by category so candidates can scan role details, deadlines, organization names, and application resources.`,
  },
  {
    question: 'How should I verify a job before applying?',
    answer: 'Check the official website or notification, confirm the deadline and eligibility, and avoid sharing sensitive information outside trusted application channels.',
  },
  {
    question: 'Can I report an outdated or inaccurate listing?',
    answer: 'Yes. Use the contact page or corrections policy to report outdated dates, broken links, or incorrect job details.',
  },
]

export const getJobCategorySeoContent = (category = {}) => {
  const name = category?.name || 'Job Category'
  const content = jobCategoryContent[category?.slug] || {}

  return {
    intro: content.intro || `${name} groups relevant job listings so candidates can compare opportunities, deadlines, eligibility, and application resources in one place.`,
    faqs: content.faqs || fallbackFaq(name),
  }
}

