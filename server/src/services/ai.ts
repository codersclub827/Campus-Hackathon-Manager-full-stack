export function generateIdea(theme: string) {
  return {
    theme,
    ideas: [
      {
        title: "Campus Impact Radar",
        summary: `An AI workflow that turns ${theme} signals into team-ready interventions with dashboards and alerts.`,
        stack: ["React", "Node.js", "MongoDB", "OpenAI-compatible API"]
      },
      {
        title: "Smart Mentor Match",
        summary: "A rubric-aware matching engine that pairs teams with mentors based on skills, risk, and domain fit.",
        stack: ["Socket.io", "Express", "Vector search", "Tailwind"]
      }
    ]
  };
}

export function evaluateProject(description: string) {
  const clarity = Math.min(10, Math.max(6, Math.round(description.length / 38)));
  return {
    score: clarity + 31,
    verdict: "Promising",
    strengths: ["Clear user problem", "Hackathon-feasible scope", "Strong demo potential"],
    improvements: ["Quantify impact metrics", "Show architecture", "Reduce pitch to one crisp story"]
  };
}

export function generateFeedback(projectName: string) {
  return {
    projectName,
    feedback:
      "The concept is strong and demo-friendly. Improve judging confidence by adding measurable outcomes, a concise risk section, and a short implementation walkthrough."
  };
}
