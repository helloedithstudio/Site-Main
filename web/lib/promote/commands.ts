// The slash commands Friday offers. They are registered for the edith server only (POST /api/discord/register), and hidden from
// everyone but server administrators by default (`default_member_permissions: "0"`). That is only a first layer: the handler
// itself checks the person's Discord id against PROMOTER_IDS on every use, so a permission mistake in Discord cannot let anyone else in.

const USER = 6; // Discord option type: a server member
const STRING = 3;

const user = (description: string) => ({ type: USER, name: "user", description, required: true });
const base = { type: 1, default_member_permissions: "0", dm_permission: false };

export const commandDefs = [
  { ...base, name: "promote", description: "Promote a Catalyst to Maintainer", options: [user("The Catalyst to promote")] },
  { ...base, name: "demote", description: "Take the Maintainer role away", options: [user("The Maintainer to demote")] },
  {
    ...base,
    name: "credit",
    description: "Note good work by a Catalyst. It counts towards a Maintainer nomination",
    options: [user("Who did the work"), { type: STRING, name: "reason", description: "What they did, in a few words", required: true, min_length: 3, max_length: 200 }],
  },
  {
    ...base,
    name: "list",
    description: "Add someone to the Legion page by GitHub username (not verified)",
    options: [{ type: STRING, name: "github", description: "Their GitHub username", required: true, min_length: 1, max_length: 39 }],
  },
  {
    ...base,
    name: "unlist",
    description: "Take someone off the Legion page",
    options: [{ type: STRING, name: "github", description: "Their GitHub username", required: true, min_length: 1, max_length: 39 }],
  },
];
