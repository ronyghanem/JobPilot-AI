import "./JobApplication.css";

function JobApplication() {
  return (
    <div className="job-page">
      <div className="job-card">
        <div className="job-header">
          <span className="company">JobPilot Test Company</span>

          <h1>Junior Software Developer</h1>

          <p>
            Beirut, Lebanon · Full Time · Entry Level
          </p>
        </div>

        <div className="job-description">
          <h2>About the role</h2>

          <p>
            We are looking for a motivated Junior Software
            Developer to join our growing technology team.
            You will work with modern web technologies and
            contribute to real-world software projects.
          </p>

          <h3>Requirements</h3>

          <ul>
            <li>Knowledge of JavaScript or TypeScript</li>
            <li>Understanding of React</li>
            <li>Basic knowledge of databases</li>
            <li>Good communication skills</li>
          </ul>
        </div>

        <form className="application-form">
          <h2>Apply for this position</h2>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fname">
                First Name
              </label>

              <input
                id="fname"
                name="fname"
                type="text"
                placeholder="Your first name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lname">
                Last Name
              </label>

              <input
                id="lname"
                name="lname"
                type="text"
                placeholder="Your last name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              name="email_address"
              type="email"
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="mobile">
              Mobile Phone Number
            </label>

            <input
              id="mobile"
              name="mobile_number"
              type="tel"
              placeholder="+961..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="city">
              Current City
            </label>

            <input
              id="city"
              name="current_city"
              type="text"
              placeholder="City"
            />
          </div>

          <div className="form-group">
            <label htmlFor="linkedin">
              LinkedIn Profile URL
            </label>

            <input
              id="linkedin"
              name="linkedin_url"
              type="url"
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="github">
              GitHub Profile
            </label>

            <input
              id="github"
              name="github_profile"
              type="url"
              placeholder="https://github.com/..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="website">
              Personal Website / Portfolio
            </label>

            <input
              id="website"
              name="personal_website"
              type="url"
              placeholder="https://..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="motivation">
              Why do you want to work with us?
            </label>

            <textarea
              id="motivation"
              name="motivation"
              rows={6}
              placeholder="Tell us why you are interested..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="experience">
              Tell us about your experience
            </label>

            <textarea
              id="experience"
              name="experience"
              rows={6}
              placeholder="Describe your experience..."
            />
          </div>

          <button type="submit">
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
}

export default JobApplication;