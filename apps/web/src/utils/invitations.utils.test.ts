import { isInvitationRecipient } from "./invitations.utils";

describe("InvitationsUtils", () => {
	describe("isInvitationRecipient", () => {
		test("should return true when the emails match exactly", () => {
			expect(
				isInvitationRecipient({
					invitationEmail: "ada@example.com",
					userEmail: "ada@example.com",
				}),
			).toBe(true);
		});

		test("should return true when the emails differ only by case", () => {
			expect(
				isInvitationRecipient({
					invitationEmail: "Ada@Example.COM",
					userEmail: "aDa@example.com",
				}),
			).toBe(true);
		});

		test("should return false when the addresses are different", () => {
			expect(
				isInvitationRecipient({
					invitationEmail: "ada@example.com",
					userEmail: "grace@example.com",
				}),
			).toBe(false);
		});

		test("should return false when the invitation email is padded with whitespace", () => {
			expect(
				isInvitationRecipient({
					invitationEmail: " ada@example.com ",
					userEmail: "ada@example.com",
				}),
			).toBe(false);
		});

		test("should return false when the user email is padded with whitespace", () => {
			expect(
				isInvitationRecipient({
					invitationEmail: "ada@example.com",
					userEmail: "ada@example.com ",
				}),
			).toBe(false);
		});

		test("should return false when both emails are empty strings", () => {
			expect(
				isInvitationRecipient({ invitationEmail: "", userEmail: "" }),
			).toBe(false);
		});

		test("should return false when the invitation email is missing", () => {
			expect(
				isInvitationRecipient({
					invitationEmail: undefined,
					userEmail: "ada@example.com",
				}),
			).toBe(false);
			expect(
				isInvitationRecipient({
					invitationEmail: "",
					userEmail: "ada@example.com",
				}),
			).toBe(false);
		});

		test("should return false when the user email is missing", () => {
			expect(
				isInvitationRecipient({
					invitationEmail: "ada@example.com",
					userEmail: undefined,
				}),
			).toBe(false);
			expect(
				isInvitationRecipient({
					invitationEmail: "ada@example.com",
					userEmail: "",
				}),
			).toBe(false);
		});

		test("should return false when both emails are missing", () => {
			expect(
				isInvitationRecipient({
					invitationEmail: undefined,
					userEmail: undefined,
				}),
			).toBe(false);
		});
	});
});
