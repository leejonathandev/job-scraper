export type Company = 'Google' | 'Discord' | 'Riot Games';

export type JobListing = {
    title: string;
    location: string;
    url: string;
    foundDate: string;
    company: Company;
};
