import ApprovedHome,{generateMetadata as homeMetadata} from '@/components/approved-home-page';

// The owner-approved homepage and its metadata are shared by both modes.
export function generateMetadata(){return homeMetadata();}
export default function Page(){return <ApprovedHome/>;}
