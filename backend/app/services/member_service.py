class MemberService:
    def update_reputation(self, member, on_time: bool):
        delta = 0.02 if on_time else -0.05
        member.reputation_score = max(0.0, min(1.0, member.reputation_score + delta))
        return member
