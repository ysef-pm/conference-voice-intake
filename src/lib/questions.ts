import { Question } from "@/types";

export const QUESTIONS: Question[] = [
    {
        index: 0,
        field: "whyJoining",
        label: "Why are you joining this conference?",
    },
    {
        index: 1,
        field: "aboutYourself",
        label: "Tell us a little bit about yourself and what you do",
    },
    {
        index: 2,
        field: "challenges",
        label: "What are the three biggest challenges you'd love to talk to other people about?",
    },
];

export const INITIAL_ANSWERS = {
    whyJoining: "",
    aboutYourself: "",
    challenges: "",
};
