import { Card } from "@/components/ui/card"

const cardContent = {
  title: "Lorem ipsum dolor",
  description: "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Nostrum, hic ipsum! Qui dicta debitis aliquid quo molestias explicabo iure!"
}

export function DefaultCardDemo() {
  return (
    <Card {...cardContent} className="max-w-[400px] bg-background" />
  )
}

export function DotsCardDemo() {
  return (
    <Card variant="dots" {...cardContent} className="max-w-[400px] bg-background" />
  )
}

export function GradientCardDemo() {
  return (
    <Card variant="gradient" {...cardContent} className="max-w-[400px] bg-background" />
  )
}

export function PlusCardDemo() {
  return (
    <Card variant="plus" {...cardContent} className="max-w-[400px] bg-background" />
  )
}

export function NeubrutalismCardDemo() {
  return (
    <Card variant="neubrutalism" {...cardContent} className="max-w-[400px] bg-background" />
  )
}

export function InnerCardDemo() {
  return (
    <Card variant="inner" {...cardContent} className="max-w-[400px] bg-background" />
  )
}

export function LiftedCardDemo() {
  return (
    <Card variant="lifted" {...cardContent} className="max-w-[400px] bg-background" />
  )
}

export function CornersCardDemo() {
  return (
    <Card variant="corners" {...cardContent} className="max-w-[400px] bg-background" />
  )
}
