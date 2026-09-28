import { describeSession } from '../../admin/session'

/** Where the editor saves, who is signed in, and what setup is missing. */
export default defineEventHandler((event) => describeSession(event))
