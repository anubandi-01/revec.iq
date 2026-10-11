import type { Review } from './analysis'

const ecommerceTexts = [
  'The product quality is excellent. The fabric feels durable and the finish is beautiful.',
  'Delivery was late by five days and the tracking never updated. Very disappointed.',
  'The packaging was perfect and everything arrived in great condition.',
  'The price is reasonable. The product does what the description says, nothing more.',
  'Customer service was helpful and resolved my refund request in one day.',
  'The product arrived broken. The material quality is poor and the box was damaged.',
  'Fast delivery and great quality. I love the stitching on this jacket.',
  'The packaging is standard. The box had no extra wrapping but the contents were intact.',
  'Support ignored my messages about a missing item. The response time was terrible.',
  'Good value for the price. A durable product that looks exactly like the photos.',
  'Delivery was delayed twice. The courier communication was confusing and frustrating.',
  'The product quality is average. The fabric is thinner than I expected.',
  'Friendly customer service and a quick resolution when I ordered the wrong size.',
  'The price is expensive for such poor quality. The finish started peeling after a week.',
  'Excellent packaging with careful wrapping. The product arrived without a scratch.',
  'Shipping took the advertised seven days. Tracking showed each transit stop.',
  'The product quality is great and the price is affordable. I am impressed.',
  'The packaging was damaged and the product was broken. My refund is still unresolved.',
  'Support explained the return policy. The process required two forms and a receipt.',
  'Easy checkout and fast delivery. The product is good value and beautifully packaged.',
]
const serviceTexts = [
  'The support agent was friendly and resolved my billing question with clear communication.',
  'The response time was slow. I waited three days and my issue is still unresolved.',
  'The representative described the policy and sent a link to the relevant form.',
  'Excellent customer service. The staff were helpful and the resolution was quick.',
  'The agent was rude and ignored the details I provided. A terrible experience.',
  'Support answered my question after two transfers. The answer matched the help page.',
  'Fast response time and clear communication. I love how the team followed up.',
  'My refund request was unresolved after a week. Communication was poor.',
  'The service representative confirmed my address and changed the account details.',
  'Great support from a friendly agent who resolved the issue on the first call.',
  'The staff gave confusing instructions and the resolution failed. Very disappointed.',
  'Customer service explained the subscription pricing without recommending a plan.',
  'The support staff were patient and helpful. The response time was excellent.',
  'The agent was unhelpful and my complaint was ignored. The service was bad.',
  'Communication arrived by email instead of phone. The issue was passed to another team.',
  'A quick resolution and good communication made the whole support experience easy.',
  'Response time was slow and the refund was delayed. I am frustrated with the service.',
  'The staff outlined the next steps. I have not yet received the final resolution.',
  'Perfect service from a helpful representative. My account issue was resolved.',
  'The support agent was rude and communication was confusing. I need another callback.',
]
const saasTexts = [
  'The interface is intuitive and the dashboard is easy to navigate. Great usability.',
  'The app crashes during export and the loading speed is slow. These bugs are frustrating.',
  'The report feature includes the fields we use. The layout is similar to our old tool.',
  'I love the automation features. The integration is reliable and saves us time.',
  'The dashboard is confusing and navigation is poor. Onboarding needs more guidance.',
  'Technical support explained the sync settings and shared the documentation.',
  'Fast loading and a smooth interface. The search feature is excellent.',
  'The app is unreliable. A sync error caused missing records and support was unhelpful.',
  'Subscription pricing matches the published plans. We are on the basic tier.',
  'Great technical support. A friendly agent resolved the integration issue quickly.',
  'The new feature is broken. Export failed twice and the loading screen stays frozen.',
  'The interface has three navigation panels. The onboarding takes about thirty minutes.',
  'Good value for the subscription price. The dashboard and reports are easy to use.',
  'The app is slow and bugs interrupt our work. Reliability has been poor this month.',
  'The notifications feature sends a daily summary. Custom scheduling is not included.',
  'Excellent usability and reliable performance. The automation is perfect for our team.',
  'Pricing is expensive for the missing features. Support response time is slow.',
  'The search feature works on titles. We use a separate tool to search full documents.',
  'Easy onboarding and helpful technical support. The interface feels intuitive.',
  'The integration has a bug and the app crashes. Our support ticket is unresolved.',
]

function createReviews(texts: string[], prefix: string, product: string, nps = false): Review[] {
  const npsScores = [10, 2, 7, 9, 1, 8, 10, 3, 7, 9, 2, 8, 10, 0, 7, 9, 4, 8, 10, 3]
  const ratings = prefix === 'EC' ? [5, 1, 5, 3, 5, 1, 5, 3, 1, 5, 1, 3, 5, 2, 5, 3, 5, 1, 3, 5] : [5, 1, 3, 5, 2, 3, 5, 1, 3, 5, 1, 3, 4, 1, 3, 5, 2, 3, 5, 1]
  return texts.map((review_text, index) => ({ review_id: `${prefix}-${String(index + 1).padStart(3, '0')}`, review_text, date: `2026-09-${String(index + 1).padStart(2, '0')}`, ...(nps ? { satisfaction_score: [5, 1, 3][index % 3], nps_score: npsScores[index] } : { product, rating: ratings[index] }) }))
}

export const samples = [
  { id: 'ecommerce', name: 'E-commerce Product Reviews', business: 'Northstar Shopping', type: 'E-commerce', description: 'Product quality, delivery, packaging & value', icon: 'shopping', reviews: createReviews(ecommerceTexts, 'EC', 'Northstar Shopping'), file: '/samples/ecommerce.csv' },
  { id: 'service', name: 'Customer Service Feedback', business: 'Evergreen Customer Care', type: 'Customer service', description: 'Response times, resolution & communication', icon: 'support', reviews: createReviews(serviceTexts, 'CS', '', true), file: '/samples/customer-service.csv' },
  { id: 'saas', name: 'SaaS Application Feedback', business: 'Orbit Workspace', type: 'SaaS application', description: 'Usability, reliability, features & support', icon: 'software', reviews: createReviews(saasTexts, 'SA', 'Orbit Workspace'), file: '/samples/saas.csv' },
]

export function containsSyntheticSamples(reviews: Review[]) {
  return reviews.some(review => samples.some(sample => sample.reviews.some(source => source.review_text === review.review_text)))
}
