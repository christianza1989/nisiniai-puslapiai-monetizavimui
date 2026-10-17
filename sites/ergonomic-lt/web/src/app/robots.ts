import type {MetadataRoute} from 'next';
import {indexable} from '@/lib/catalog';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{return {rules:indexable()?{userAgent:'*',allow:'/',disallow:['/api/']}:{userAgent:'*',disallow:'/'},sitemap:'https://ergonomic.lt/sitemap.xml'};}
