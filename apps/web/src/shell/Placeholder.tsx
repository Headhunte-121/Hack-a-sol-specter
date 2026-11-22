import { Layout } from './Layout'

export default function Placeholder({ title }: { title: string }) {
  return (
    <Layout>
      <div className="card">{title}</div>
    </Layout>
  )
}
