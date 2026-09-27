import { createHash } from 'node:crypto';
import { discoveryHeaders } from '@/lib/discovery/catalog';
import { propertySkill, skillDescription, skillName, skillUrl } from '@/lib/discovery/property-skill';

export function GET() {
  return Response.json({
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [{
      name: skillName, type: 'skill-md', description: skillDescription, url: skillUrl,
      digest: 'sha256:' + createHash('sha256').update(propertySkill, 'utf8').digest('hex'),
    }],
  }, { headers: discoveryHeaders });
}
