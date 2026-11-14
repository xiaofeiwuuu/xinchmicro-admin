// 教学视频三个页面（课程、章节、视频）共用的小函数。金额一律整数「分」
export const yuan = (fen) => (fen / 100).toFixed(2);
export const toFen = (v) => (v === null || v === undefined || v === '' ? null : Math.round(Number(v) * 100));
export const mmss = (sec) => {
	if (!sec) return '-';
	return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
// 把目录树摊平成三张列表：课程、章节（带课程名）、视频（带课程名、章节名）
export function flatten(tree) {
	const courses = [];
	const chapters = [];
	const videos = [];
	(tree || []).forEach((c) => {
		const all = c.videos.map((v) => ({ ...v, courseTitle: c.title, chapterTitle: '-' }));
		c.chapters.forEach((ch) => {
			chapters.push({ id: ch.id, courseId: c.id, title: ch.title, sortOrder: ch.sortOrder, status: ch.status, courseTitle: c.title, videoCount: ch.videos.length });
			ch.videos.forEach((v) => all.push({ ...v, courseTitle: c.title, chapterTitle: ch.title }));
		});
		videos.push(...all);
		courses.push({ id: c.id, title: c.title, intro: c.intro, sortOrder: c.sortOrder, status: c.status, chapterCount: c.chapters.length, videoCount: all.length });
	});
	return { courses, chapters, videos };
}
