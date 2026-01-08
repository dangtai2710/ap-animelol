/**
 * SEO Template utilities for replacing variables in SEO templates
 */

export interface SeoVariables {
  sitename?: string;
  phim?: string;
  phimgoc?: string;
  theloai?: string;
  quocgia?: string;
  nam?: string | number;
  tag?: string;
  dienvien?: string;
  daodien?: string;
  tap?: string;
  chatluong?: string;
  ngonngu?: string;
  noidung?: string;
  thumb?: string;
}

/**
 * Replace SEO template variables with actual values
 * Variables: %sitename%, %phim%, %phimgoc%, %theloai%, %quocgia%, %nam%, %tag%, 
 * %dienvien%, %daodien%, %tap%, %chatluong%, %ngonngu%, %noidung%, %thumb%
 */
export function replaceSeoVariables(template: string | null | undefined, variables: SeoVariables): string {
  if (!template) return "";
  
  let result = template;
  
  // Replace ALL variables - always replace even if value is empty/undefined
  // This ensures template variables are processed correctly
  result = result.replace(/%sitename%/gi, variables.sitename || "");
  result = result.replace(/%phim%/gi, variables.phim || "");
  result = result.replace(/%phimgoc%/gi, variables.phimgoc || "");
  result = result.replace(/%theloai%/gi, variables.theloai || "");
  result = result.replace(/%quocgia%/gi, variables.quocgia || "");
  result = result.replace(/%nam%/gi, variables.nam !== undefined && variables.nam !== null ? String(variables.nam) : "");
  result = result.replace(/%tag%/gi, variables.tag || "");
  result = result.replace(/%dienvien%/gi, variables.dienvien || "");
  result = result.replace(/%daodien%/gi, variables.daodien || "");
  result = result.replace(/%tap%/gi, variables.tap || "");
  result = result.replace(/%chatluong%/gi, variables.chatluong || "");
  result = result.replace(/%ngonngu%/gi, variables.ngonngu || "");
  result = result.replace(/%noidung%/gi, variables.noidung ? stripHtml(variables.noidung) : "");
  result = result.replace(/%thumb%/gi, variables.thumb || "");
  
  // Clean up multiple spaces and trim
  result = result.replace(/\s+/g, " ").trim();
  
  return result;
}

/**
 * Strip HTML tags from a string
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number = 160): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + "...";
}

/**
 * Extract variables from movie data
 */
export function extractMovieVariables(movie: any, siteName?: string): SeoVariables {
  // Return empty variables if movie is undefined/null
  if (!movie) {
    return {
      sitename: siteName || "",
      phim: "",
      phimgoc: "",
      theloai: "",
      quocgia: "",
      nam: "",
      dienvien: "",
      daodien: "",
      tap: "",
      chatluong: "",
      ngonngu: "",
      noidung: "",
      thumb: "",
    };
  }

  const getNames = (arr: any[] | undefined): string => {
    if (!arr || arr.length === 0) return "";
    return arr.map(item => typeof item === "string" ? item : item?.name || "").filter(Boolean).join(", ");
  };
  
  return {
    sitename: siteName || "",
    phim: movie.name || "",
    phimgoc: movie.origin_name || "",
    theloai: getNames(movie.category),
    quocgia: getNames(movie.country),
    nam: movie.year || "",
    dienvien: getNames(movie.actor),
    daodien: getNames(movie.director),
    tap: movie.episode_current || "",
    chatluong: movie.quality || "",
    ngonngu: movie.lang || "",
    noidung: movie.content || "",
    thumb: movie.thumb_url || movie.poster_url || "",
  };
}
