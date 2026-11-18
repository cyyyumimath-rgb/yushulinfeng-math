/** The signed session's sa_ namespace is issued only after the teacher password check. */
export function isVerifiedTeacher(user:{userId:string;email:string}|null,teacherEmail?:string) {
  return Boolean(user && teacherEmail?.trim() && user.userId.startsWith("sa_")
    && user.email.trim().toLowerCase() === teacherEmail.trim().toLowerCase());
}
