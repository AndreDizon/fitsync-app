import { Heart, MessageCircle, MapPin, Clock3 } from 'lucide-react'

const examples = {
  forum: [
    { name: 'Alex M.', avatar: 'fox', topic: 'Small win', title: 'Three sessions. One good week.', body: 'Kept my workouts short and showed up three times. Celebrating consistency over a perfect routine.', detail: 'Celebrate progress', Icon: Heart },
    { name: 'Sam R.', avatar: 'panda', topic: 'Food & routine', title: 'What is your go-to easy lunch?', body: 'Building a meal routine around busy days. What do you prepare when you only have a little time?', detail: 'Share an idea', Icon: MessageCircle },
    { name: 'Jamie L.', avatar: 'rabbit', topic: 'Getting started', title: 'Starting small still counts.', body: 'A ten-minute walk helped me get moving today. What makes it easier for you to start?', detail: 'Keep the conversation going', Icon: MessageCircle },
  ],
  people: [
    { name: 'Riley C.', avatar: 'tiger', topic: 'Gym buddy', title: 'A little company for strength days.', body: 'Looking for a training buddy who enjoys a steady pace. New to the gym? We can learn together.', detail: 'Weekday evenings', Icon: Clock3 },
    { name: 'Maya S.', avatar: 'koala', topic: 'Running buddy', title: 'Easy runs, good company.', body: 'Hoping to meet someone for relaxed weekend runs or walks. Conversation pace is my kind of pace.', detail: 'Weekend mornings', Icon: Clock3 },
    { name: 'Casey T.', avatar: 'penguin', topic: 'Fitness instructor', title: 'Make room for movement.', body: 'Interested in connecting over simple strength routines, mobility and building confidence with exercise.', detail: 'Share your general area', Icon: MapPin },
  ],
} as const

export function CommunityExamples({ kind }: { kind: 'forum' | 'people' }) {
  return <div className="sc-examples">
    <div className="sc-examples-label"><span>Community preview</span><small>Example posts · Fictional profiles</small></div>
    <div className="sc-examples-grid">
      {examples[kind].map(({ name, avatar, topic, title, body, detail, Icon }) => <article className="sc-example-post" key={name}>
        <div className="sc-example-person"><span className={'sc-example-avatar sc-example-avatar-' + avatar} aria-hidden="true"/><div><strong>{name}</strong><span>{topic}</span></div></div>
        <h4>{title}</h4>
        <p>{body}</p>
        <div className="sc-example-detail"><Icon size={15} aria-hidden="true"/><span>{detail}</span></div>
      </article>)}
    </div>
    <p className="sc-examples-caption">{kind === 'forum' ? 'A glimpse of what you can share. Open the forum for real conversations.' : 'An idea of who you could meet. Open introductions to explore real profiles.'}</p>
  </div>
}
